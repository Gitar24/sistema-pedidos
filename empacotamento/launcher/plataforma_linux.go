package main

import (
	"errors"
	"fmt"
	"html"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

func administrarServico(_ string) bool {
	return false
}

func iniciarServico() error {
	if pronto(false) {
		return nil
	}
	// A conexão à porta do socket do systemd solicita a ativação do serviço.
	if aguardar(false) {
		return nil
	}
	socket, _ := exec.Command("/usr/bin/systemctl", "is-active", "comandas.socket").Output()
	if string(socket) != "active\n" && portaOcupada(false) {
		return errors.New("A porta 3000 está ocupada por outro programa.")
	}
	return errors.New("O serviço Comandas não conseguiu iniciar. O diagnóstico do serviço também está no Jornal do sistema, nas unidades comandas.service e comandas.socket.")
}

func caminhoLog(demo bool) string {
	if demo {
		pasta := os.Getenv("XDG_STATE_HOME")
		if !filepath.IsAbs(pasta) {
			home, _ := os.UserHomeDir()
			pasta = filepath.Join(home, ".local", "state")
		}
		return filepath.Join(pasta, "comandas", "demo.log")
	}
	return "/var/log/comandas/erros.log"
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
	comando := exec.Command(filepath.Join(pasta, "node"), filepath.Join(pasta, "servidor", "iniciar.js"), "--demo")
	comando.Env = []string{"PATH=/usr/bin:/bin", "PORTA=3001"}
	comando.Stdout, comando.Stderr = arquivo, arquivo
	comando.SysProcAttr = &syscall.SysProcAttr{Setsid: true}
	if erro := comando.Start(); erro != nil {
		return erro
	}
	return comando.Process.Release()
}

func abrirNavegador(endereco string) error {
	return exec.Command("/usr/bin/xdg-open", endereco).Run()
}

func mostrarErro(mensagem string) {
	if caminho, erro := exec.LookPath("zenity"); erro == nil {
		if exec.Command(caminho, "--error", "--title=Comandas", "--no-markup", "--text="+mensagem).Run() == nil {
			return
		}
	}
	pagina, erro := os.CreateTemp("", "comandas-erro-*.html")
	if erro != nil {
		return
	}
	defer pagina.Close()
	fmt.Fprintf(pagina, "<!doctype html><meta charset=utf-8><title>Comandas</title><h1>Falha ao abrir Comandas</h1><p style='white-space:pre-wrap'>%s</p>", html.EscapeString(mensagem))
	abrirNavegador(pagina.Name())
}
