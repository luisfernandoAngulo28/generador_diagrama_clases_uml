# Exporta el .docx final a PDF con Word. Lo llama finalizar_con_word.ps1 en un
# proceso aparte: exportar en el mismo proceso, después de guardar, dejaba a
# Word trabado o lo cerraba sin generar el PDF (05/11/2026).
param([string]$Nombre = 'Examen_Parcial_2_Grupo43_SW1')
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$docx = Join-Path $dir ($Nombre + '.docx')
$pdf  = Join-Path $dir ($Nombre + '.pdf')
$word = New-Object -ComObject Word.Application
$word.Visible = $true
$word.DisplayAlerts = 0
try {
    # Open(FileName, ConfirmConversions, ReadOnly, AddToRecentFiles)
    $doc = $word.Documents.Open($docx, $false, $true, $false)
    $doc.ExportAsFixedFormat($pdf, 17)  # wdExportFormatPDF
    "PDF: $pdf ($($doc.ComputeStatistics(2)) páginas)"
    $doc.Close(0)
}
finally {
    $word.Quit()
}
