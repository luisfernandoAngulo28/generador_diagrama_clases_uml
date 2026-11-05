# Abre el documento generado con Microsoft Word, agrega numeración de páginas
# (sin número en la carátula), actualiza el índice, guarda el .docx y exporta
# un PDF. Uso (desde la raíz del repo, después de ensamblar_documento.py):
#   powershell -ExecutionPolicy Bypass -File docs/documento_final/finalizar_con_word.ps1
#
# Notas:
# - Word corre visible y directo en este proceso. Dentro de un Start-Job oculto
#   la exportación a PDF se colgaba sin mostrar nada (05/11/2026); así, si Word
#   pregunta algo, el diálogo se ve en pantalla.
# - Cierre antes el .docx si lo tiene abierto: si no, Word lo abre como solo lectura.
# - Si queda un archivo de bloqueo "~$..." de una ejecución anterior, se borra.
param([string]$Nombre = 'Examen_Parcial_2_Grupo43_SW1')
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
Get-ChildItem -LiteralPath $dir -Filter '~$*' -Force | Remove-Item -Force

$docx = Join-Path $dir ($Nombre + '.docx')
$pdf  = Join-Path $dir ($Nombre + '.pdf')
$word = New-Object -ComObject Word.Application
$word.Visible = $true
$word.DisplayAlerts = 0
try {
    # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles)
    $doc = $word.Documents.Open($docx, $false, $false, $false)
    if ($doc.ReadOnly) { throw "Word abrió $docx como solo lectura: ciérrelo (o cierre WINWORD) y reintente." }
    $section = $doc.Sections.Item(1)
    $section.PageSetup.DifferentFirstPageHeaderFooter = -1
    $null = $section.Footers.Item(1).PageNumbers.Add(1, $false)  # centrado, sin número en la carátula
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Save()
    $doc.Close(0)
    "Guardado: $docx"
}
finally {
    $word.Quit()
}

# Exportar en la misma sesión justo después de Save() dejaba a Word trabado
# (05/11/2026). Con una sesión nueva y el archivo en solo lectura tarda ~45 s.
$word = New-Object -ComObject Word.Application
$word.Visible = $true
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($docx, $false, $true, $false)
    $doc.ExportAsFixedFormat($pdf, 17)  # wdExportFormatPDF
    "PDF: $pdf ($($doc.ComputeStatistics(2)) páginas)"
    $doc.Close(0)
}
finally {
    $word.Quit()
}
