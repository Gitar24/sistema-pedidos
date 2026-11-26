package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
	"time"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

func textoWindows(valor string) *uint16 {
	return windows.StringToUTF16Ptr(valor)
}

func pastaCompartilhada() string {
	diretorio, erro := windows.KnownFolderPath(windows.FOLDERID_ProgramData, 0)
	if erro != nil {
		diretorio = os.Getenv("ProgramData")
	}
	return filepath.Join(diretorio, "Comandas")
}

func caminhoLog(demo bool) string {
	if demo {
		diretorio, _ := os.UserCacheDir()
		return filepath.Join(diretorio, "Comandas", "demo.log")
	}
	return filepath.Join(pastaCompartilhada(), "logs", "servidor.log")
}

func comandoNode(pasta string, argumento string) *exec.Cmd {
	comando := exec.Command(filepath.Join(pasta, "node.exe"), filepath.Join(pasta, "servidor", "iniciar.js"), argumento)
	comando.Dir = pasta
	comando.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: windows.CREATE_NO_WINDOW}
	for _, nome := range []string{"SystemRoot", "TEMP", "TMP", "USERPROFILE", "LOCALAPPDATA"} {
		if valor, ok := os.LookupEnv(nome); ok {
			comando.Env = append(comando.Env, nome+"="+valor)
		}
	}
	return comando
}

func iniciarProcessoDemo(pasta string) error {
	log := caminhoLog(true)
	if erro := os.MkdirAll(filepath.Dir(log), 0700); erro != nil {
		return erro
	}
	arquivo, erro := os.OpenFile(log, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0600)
	if erro != nil {
		return erro
	}
	defer arquivo.Close()
	comando := comandoNode(pasta, "--demo")
	comando.Env = append(comando.Env, "PORTA=3001")
	comando.Stdout, comando.Stderr = arquivo, arquivo
	if erro := comando.Start(); erro != nil {
		return erro
	}
	return comando.Process.Release()
}

func abrirNavegador(endereco string) error {
	return windows.ShellExecute(0, textoWindows("open"), textoWindows(endereco), nil, nil, windows.SW_SHOWNORMAL)
}

func mostrarErro(mensagem string) {
	windows.MessageBox(0, textoWindows(mensagem), textoWindows("Comandas"), windows.MB_OK|windows.MB_ICONERROR)
}

func iniciarServico() error {
	if pronto(false) {
		return nil
	}
	gerenciador, erro := windows.OpenSCManager(nil, nil, windows.SC_MANAGER_CONNECT)
	if erro != nil {
		return fmt.Errorf("Não foi possível acessar o gerenciador de serviços: %w", erro)
	}
	defer windows.CloseServiceHandle(gerenciador)
	handle, erro := windows.OpenService(gerenciador, textoWindows(nomeServico), windows.SERVICE_START|windows.SERVICE_QUERY_STATUS)
	if erro != nil {
		return fmt.Errorf("Não foi possível acessar o serviço Comandas: %w", erro)
	}
	servico := &mgr.Service{Name: nomeServico, Handle: handle}
	defer servico.Close()

	return iniciarEAguardar(servico)
}

func iniciarEAguardar(servico *mgr.Service) error {
	if erro := servico.Start(); erro != nil && !errors.Is(erro, windows.ERROR_SERVICE_ALREADY_RUNNING) {
		return fmt.Errorf("O Windows não conseguiu iniciar o serviço Comandas: %w", erro)
	}
	limite := time.Now().Add(12 * time.Second)
	for time.Now().Before(limite) {
		if pronto(false) {
			return nil
		}
		estado, erro := servico.Query()
		if erro != nil {
			return fmt.Errorf("Não foi possível consultar o serviço Comandas: %w", erro)
		}
		if estado.State == svc.Stopped {
			if estado.ServiceSpecificExitCode == 98 {
				return errors.New("A porta 3000 está ocupada por outro programa.")
			}
			return fmt.Errorf("O serviço Comandas parou durante a inicialização (código %d).", estado.ServiceSpecificExitCode)
		}
		time.Sleep(200 * time.Millisecond)
	}
	return errors.New("O serviço Comandas não ficou pronto a tempo.")
}
