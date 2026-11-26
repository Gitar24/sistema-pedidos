package main

import (
	"bufio"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

type servidorWindows struct{}

func configuracaoDaImpressora(pasta string) ([]string, error) {
	arquivo, erro := os.Open(filepath.Join(pasta, "impressora.env"))
	if erro != nil {
		return nil, erro
	}
	defer arquivo.Close()
	var ambiente []string
	leitor := bufio.NewScanner(arquivo)
	for leitor.Scan() {
		linha := strings.TrimSpace(strings.TrimPrefix(leitor.Text(), "\ufeff"))
		nome, valor, _ := strings.Cut(linha, "=")
		switch nome {
		case "IMPRESSORA_MODO", "IMPRESSORA_ENDERECO", "IMPRESSORA_PORTA", "IMPRESSORA_TEMPO_LIMITE_MS":
			ambiente = append(ambiente, nome+"="+strings.TrimSpace(valor))
		}
	}
	return ambiente, leitor.Err()
}

func (servidorWindows) Execute(_ []string, pedidos <-chan svc.ChangeRequest, estados chan<- svc.Status) (bool, uint32) {
	estados <- svc.Status{State: svc.StartPending, WaitHint: 15000}
	log, erro := os.OpenFile(caminhoLog(false), os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if erro != nil {
		return true, 2
	}
	defer log.Close()
	pasta := pastaCompartilhada()
	impressora, erro := configuracaoDaImpressora(pasta)
	if erro != nil {
		fmt.Fprintln(log, "Não foi possível ler a configuração da impressora:", erro)
		return true, 3
	}

	comando := comandoNode(filepath.Dir(executavel()), "--servico-windows")
	comando.Env = append(comando.Env, "PORTA=3000",
		"ARQUIVO_BANCO="+filepath.Join(pasta, "dados", "pedidos.db"),
		"ARQUIVO_LOG="+filepath.Join(pasta, "logs", "erros.log"),
		"IMPRESSORA_PASTA_SIMULACAO="+filepath.Join(pasta, "dados", "impressoes"))
	comando.Env = append(comando.Env, impressora...)
	comando.Stdout, comando.Stderr = log, log
	entrada, erro := comando.StdinPipe()
	if erro != nil {
		fmt.Fprintln(log, "Falha ao preparar o processo Node.js:", erro)
		return true, 4
	}
	defer entrada.Close()
	if erro := comando.Start(); erro != nil {
		fmt.Fprintln(log, "Falha ao iniciar o Node.js:", erro)
		return true, 4
	}

	terminou := make(chan error, 1)
	go func() { terminou <- comando.Wait() }()
	estado := svc.Status{State: svc.Running, Accepts: svc.AcceptStop | svc.AcceptShutdown}
	estados <- estado
	for {
		select {
		case erro := <-terminou:
			var saida *exec.ExitError
			if errors.As(erro, &saida) {
				fmt.Fprintln(log, "O servidor encerrou com código", saida.ExitCode())
				return true, uint32(saida.ExitCode())
			}
			return false, 0
		case pedido := <-pedidos:
			switch pedido.Cmd {
			case svc.Interrogate:
				estados <- estado
			case svc.Stop, svc.Shutdown:
				estados <- svc.Status{State: svc.StopPending, WaitHint: 15000}
				entrada.Close()
				select {
				case <-terminou:
				case <-time.After(12 * time.Second):
					comando.Process.Kill()
					<-terminou
				}
				return false, 0
			}
		}
	}
}

func pararServico(servico *mgr.Service) error {
	limite := time.Now().Add(25 * time.Second)
	for time.Now().Before(limite) {
		estado, erro := servico.Query()
		if erro != nil || estado.State == svc.Stopped {
			return erro
		}
		if estado.State == svc.Running {
			if _, erro := servico.Control(svc.Stop); erro != nil && !errors.Is(erro, windows.ERROR_SERVICE_NOT_ACTIVE) {
				return erro
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	return errors.New("o serviço Comandas ainda está em execução")
}

func dacl(sddl string) (*windows.ACL, error) {
	descritor, erro := windows.SecurityDescriptorFromString(sddl)
	if erro != nil {
		return nil, erro
	}
	lista, _, erro := descritor.DACL()
	return lista, erro
}

func verificarPastaAdministrativa(caminho string) error {
	atributos, erro := windows.GetFileAttributes(textoWindows(caminho))
	if erro != nil {
		return erro
	}
	if atributos&windows.FILE_ATTRIBUTE_REPARSE_POINT != 0 {
		return fmt.Errorf("o diretório de dados é um ponto de redirecionamento: %s", caminho)
	}
	descritor, erro := windows.GetNamedSecurityInfo(caminho, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION)
	if erro != nil {
		return erro
	}
	dono, _, erro := descritor.Owner()
	if erro != nil {
		return erro
	}
	if dono.IsWellKnown(windows.WinBuiltinAdministratorsSid) || dono.IsWellKnown(windows.WinLocalSystemSid) {
		return nil
	}
	usuario, erro := windows.GetCurrentProcessToken().GetTokenUser()
	if erro != nil {
		return erro
	}
	if !dono.Equals(usuario.User.Sid) {
		return fmt.Errorf("o diretório de dados pertence a outra conta: %s", caminho)
	}
	return nil
}

func prepararPastas(servico *mgr.Service) error {
	lista, erro := dacl("D:(A;;GA;;;SY)(A;;GA;;;BA)(A;;LCRP;;;IU)")
	if erro != nil {
		return erro
	}
	if erro := windows.SetSecurityInfo(servico.Handle, windows.SE_SERVICE, windows.DACL_SECURITY_INFORMATION, nil, nil, lista, nil); erro != nil {
		return erro
	}

	// A conta LocalService só recebe acesso a estas pastas através do SID específico do serviço.
	sid, _, _, erro := windows.LookupSID("", "NT SERVICE\\"+nomeServico)
	if erro != nil {
		return erro
	}
	pasta := pastaCompartilhada()
	for _, item := range []struct{ nome, direitos string }{
		{"", "GRGX"}, {"dados", "0x1301bf"}, {"logs", "0x1301bf"},
	} {
		caminho := filepath.Join(pasta, item.nome)
		if erro := os.MkdirAll(caminho, 0700); erro != nil {
			return erro
		}
		if erro := verificarPastaAdministrativa(caminho); erro != nil {
			return erro
		}
		lista, erro := dacl("D:P(A;OICI;FA;;;SY)(A;OICI;FA;;;BA)(A;OICI;" + item.direitos + ";;;" + sid.String() + ")")
		if erro != nil {
			return erro
		}
		if erro := windows.SetNamedSecurityInfo(caminho, windows.SE_FILE_OBJECT,
			windows.DACL_SECURITY_INFORMATION|windows.PROTECTED_DACL_SECURITY_INFORMATION, nil, nil, lista, nil); erro != nil {
			return erro
		}
	}

	origem := filepath.Join(filepath.Dir(executavel()), "impressora-padrao.env")
	conteudo, erro := os.ReadFile(origem)
	if erro != nil {
		return erro
	}
	arquivo, erro := os.OpenFile(filepath.Join(pasta, "impressora.env"), os.O_CREATE|os.O_EXCL|os.O_WRONLY, 0600)
	if errors.Is(erro, os.ErrExist) {
		return nil
	}
	if erro != nil {
		return erro
	}
	_, erro = arquivo.Write(conteudo)
	return errors.Join(erro, arquivo.Close())
}

func configurarServico(acao string) error {
	gerenciador, erro := mgr.Connect()
	if erro != nil {
		return erro
	}
	defer gerenciador.Disconnect()

	servico, erro := gerenciador.OpenService(nomeServico)
	if errors.Is(erro, windows.ERROR_SERVICE_DOES_NOT_EXIST) {
		if acao != "instalar-servico" {
			return nil
		}
		servico, erro = gerenciador.CreateService(nomeServico, executavel(), mgr.Config{
			DisplayName: nomeServico, Description: "Servidor local de pedidos do Comandas.",
			StartType: mgr.StartAutomatic, ServiceStartName: "NT AUTHORITY\\LocalService",
			SidType: windows.SERVICE_SID_TYPE_UNRESTRICTED,
		}, "servico")
	}
	if erro != nil {
		return erro
	}
	defer servico.Close()

	switch acao {
	case "instalar-servico":
		return prepararPastas(servico)
	case "iniciar-servico":
		return iniciarEAguardar(servico)
	default:
		if erro := pararServico(servico); erro != nil {
			return erro
		}
		if acao == "remover-servico" {
			return servico.Delete()
		}
		return nil
	}
}

func administrarServico(acao string) bool {
	if acao == "parar-servico" && pronto(true) {
		os.Exit(3)
	}
	var erro error
	switch acao {
	case "servico":
		erro = svc.Run(nomeServico, servidorWindows{})
	case "instalar-servico", "iniciar-servico", "parar-servico", "remover-servico":
		erro = configurarServico(acao)
	default:
		return false
	}
	if erro != nil {
		log := caminhoLog(false)
		if arquivo, falha := os.OpenFile(log, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600); falha == nil {
			fmt.Fprintln(arquivo, "Falha do serviço Comandas:", erro)
			arquivo.Close()
		}
		os.Exit(1)
	}
	return true
}
