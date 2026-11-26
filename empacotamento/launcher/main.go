package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

const nomeServico = "Comandas"

var cliente = &http.Client{
	Timeout:   850 * time.Millisecond,
	Transport: &http.Transport{},
	CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
		return http.ErrUseLastResponse
	},
}

func urlLocal(demo bool) string {
	if demo {
		return "http://127.0.0.1:3001"
	}
	return "http://127.0.0.1:3000"
}

func pronto(demo bool) bool {
	resposta, erro := cliente.Get(urlLocal(demo) + "/api/saude")
	if erro != nil {
		return false
	}
	defer resposta.Body.Close()
	var estado struct {
		Aplicativo   string
		Demonstracao bool
	}
	return resposta.StatusCode == http.StatusOK &&
		json.NewDecoder(http.MaxBytesReader(nil, resposta.Body, 4096)).Decode(&estado) == nil &&
		estado.Aplicativo == "comandas" && estado.Demonstracao == demo
}

func aguardar(demo bool) bool {
	limite := time.Now().Add(12 * time.Second)
	for time.Now().Before(limite) {
		if pronto(demo) {
			return true
		}
		time.Sleep(200 * time.Millisecond)
	}
	return false
}

func portaOcupada(demo bool) bool {
	conexao, erro := net.DialTimeout("tcp", urlLocal(demo)[len("http://"):], 500*time.Millisecond)
	if erro != nil {
		return false
	}
	conexao.Close()
	return true
}

func executavel() string {
	arquivo, erro := os.Executable()
	if erro != nil {
		panic(erro)
	}
	return arquivo
}

func iniciarDemo() error {
	if pronto(true) {
		return nil
	}
	if erro := iniciarProcessoDemo(filepath.Dir(executavel())); erro != nil {
		return erro
	}
	if aguardar(true) {
		return nil
	}
	if portaOcupada(true) {
		return errors.New("A porta 3001 está ocupada por outro programa.")
	}
	return errors.New("A demonstração não ficou pronta.")
}

func main() {
	if len(os.Args) == 2 && administrarServico(os.Args[1]) {
		return
	}

	demo := len(os.Args) == 2 && os.Args[1] == "demo"
	iniciar := iniciarServico
	if demo {
		iniciar = iniciarDemo
	}
	erro := iniciar()
	if erro == nil {
		erro = abrirNavegador(urlLocal(demo))
	}
	if erro != nil {
		mostrarErro(fmt.Sprintf("%s\n\nLog: %s", erro.Error(), caminhoLog(demo)))
		os.Exit(1)
	}
}
