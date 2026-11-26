# -*- coding: utf-8 -*-
Unicode true
!include "MUI2.nsh"
!include "x64.nsh"
!include "LogicLib.nsh"

Name "Comandas"
OutFile "${SAIDA}"
InstallDir "$PROGRAMFILES64\Comandas"
RequestExecutionLevel admin
SetCompressor /SOLID lzma
VIProductVersion "${VERSAO}.0"
VIAddVersionKey "ProductName" "Comandas"
VIAddVersionKey "FileDescription" "Instalador do Comandas"
VIAddVersionKey "LegalCopyright" "Comandas"
VIAddVersionKey "FileVersion" "${VERSAO}"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

Function .onInit
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "Este instalador requer Windows de 64 bits."
    Abort
  ${EndIf}
  SetRegView 64
  SetShellVarContext all
  StrCpy $INSTDIR "$PROGRAMFILES64\Comandas"
FunctionEnd

Section "Comandas"
  IfFileExists "$INSTDIR\Comandas.exe" 0 copiar
    ClearErrors
    ExecWait '"$INSTDIR\Comandas.exe" parar-servico' $0
    ${If} $0 == 3
      MessageBox MB_ICONSTOP "A demonstração está aberta. Reinicie o computador e instale a atualização antes de abrir a demonstração novamente." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}
    ${If} ${Errors}
    ${OrIf} $0 != 0
      MessageBox MB_ICONSTOP "Não foi possível parar o serviço para atualizar. Consulte $APPDATA\Comandas\logs\servidor.log." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}

  copiar:
    SetOutPath "$INSTDIR"
    File /r "${CONTEUDO}/*"
    ClearErrors
    ExecWait '"$INSTDIR\Comandas.exe" instalar-servico' $0
    ${If} ${Errors}
    ${OrIf} $0 != 0
      MessageBox MB_ICONSTOP "Não foi possível configurar o serviço Comandas. Consulte $APPDATA\Comandas\logs\servidor.log ou o Visualizador de Eventos." /SD IDOK
      SetErrorLevel 1
      Abort
    ${EndIf}

    CreateDirectory "$SMPROGRAMS\Comandas"
    CreateShortCut "$DESKTOP\Comandas.lnk" "$INSTDIR\Comandas.exe"
    CreateShortCut "$SMPROGRAMS\Comandas\Comandas.lnk" "$INSTDIR\Comandas.exe"
    CreateShortCut "$SMPROGRAMS\Comandas\Demonstração do Comandas.lnk" "$INSTDIR\Comandas.exe" "demo"

    WriteUninstaller "$INSTDIR\Desinstalar.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Comandas" "DisplayName" "Comandas"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Comandas" "DisplayVersion" "${VERSAO}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Comandas" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Comandas" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Comandas" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Comandas" "NoRepair" 1

    ClearErrors
    ExecWait '"$INSTDIR\Comandas.exe" iniciar-servico' $0
    ${If} ${Errors}
    ${OrIf} $0 != 0
      MessageBox MB_ICONEXCLAMATION "Comandas foi instalado e o serviço não abriu. Use o atalho para ver o diagnóstico. Log: $APPDATA\Comandas\logs\servidor.log." /SD IDOK
    ${EndIf}
SectionEnd

Function un.onInit
  SetRegView 64
  SetShellVarContext all
FunctionEnd

Section "Uninstall"
  ClearErrors
  ExecWait '"$INSTDIR\Comandas.exe" remover-servico' $0
  ${If} ${Errors}
  ${OrIf} $0 != 0
    MessageBox MB_ICONSTOP "Não foi possível remover o serviço. Consulte $APPDATA\Comandas\logs\servidor.log." /SD IDOK
    SetErrorLevel 1
    Abort
  ${EndIf}
  Delete "$DESKTOP\Comandas.lnk"
  Delete "$SMPROGRAMS\Comandas\Comandas.lnk"
  Delete "$SMPROGRAMS\Comandas\Demonstração do Comandas.lnk"
  RMDir "$SMPROGRAMS\Comandas"
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\Comandas"
  RMDir /r /REBOOTOK "$INSTDIR"
SectionEnd
