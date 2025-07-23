# -------------------------------------------
# VigilAPP - Concatenar SRC em único arquivo
# -------------------------------------------

# Caminho da pasta SRC
$srcPath = "C:\Users\User\Desktop\vigilAPP\src"

# Caminho de saída na Área de Trabalho
$outputFile = "$HOME\Desktop\vigilAPP_src_concatenado.txt"

# Verifica se já existe para evitar conflito
if (Test-Path $outputFile) {
    Remove-Item $outputFile -Force
}

# Busca todos os arquivos dentro de SRC
Get-ChildItem -Path $srcPath -File -Recurse |
Get-Content |
Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "✅ Arquivo criado com sucesso: $outputFile"
