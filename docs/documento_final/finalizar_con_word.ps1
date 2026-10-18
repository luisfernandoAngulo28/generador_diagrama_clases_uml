# Abre el documento generado con Microsoft Word, agrega numeración de páginas
# (sin número en la carátula), actualiza el índice, guarda el .docx y exporta
# un PDF. Uso (desde la raíz del repo, después de build_documento.py):
#   powershell -ExecutionPolicy Bypass -File docs/documento_final/finalizar_con_word.ps1
#
# Notas: Word corre oculto dentro de un job con límite de tiempo, para que un
# diálogo invisible no deje el proceso colgado. Si queda un archivo de bloqueo
# "~$..." de una ejecución anterior, se borra antes de abrir.
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-ChildItem -LiteralPath $dir -Filter '~$*' -Force | Remove-Item -Force

$inicio = Get-Date
$job = Start-Job -ArgumentList $dir {
    param($dir)
    $docx = Join-Path $dir 'Segundo_Parcial_Grupo43_SW1.docx'
    $pdf  = Join-Path $dir 'Segundo_Parcial_Grupo43_SW1.pdf'
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    try {
        # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles)
        $doc = $word.Documents.Open($docx, $false, $false, $false)
        $section = $doc.Sections.Item(1)
        $section.PageSetup.DifferentFirstPageHeaderFooter = -1
        $null = $section.Footers.Item(1).PageNumbers.Add(1, $false)  # centrado, sin número en la carátula
        foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
        $doc.Save()
        $doc.ExportAsFixedFormat($pdf, 17)  # wdExportFormatPDF
        $pages = $doc.ComputeStatistics(2)
        $doc.Close(0)
        "Guardado: $docx ($pages páginas)"
        "PDF: $pdf"
    }
    finally {
        $word.Quit()
    }
}
if (Wait-Job $job -Timeout 240) {
    Receive-Job $job
} else {
    Stop-Job $job
    Write-Error 'Word no respondió en 4 minutos. Cierre WINWORD desde el Administrador de tareas y reintente.'
}
Remove-Job $job -Force

# La instancia oculta de Word a veces sigue viva después de Quit() y bloquea la
# siguiente ejecución: se cierra solo la que abrió este script (sin ventana).
Get-Process WINWORD -ErrorAction SilentlyContinue |
    Where-Object { $_.StartTime -ge $inicio -and $_.MainWindowHandle -eq 0 } |
    Stop-Process -Force
