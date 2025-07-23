# Caminhos
$pastaBase = "C:\Users\User\Desktop\escala vigilav"
$pastaDestino = "$pastaBase\IAPROGRAMMING"
$arquivoDestino = "$pastaDestino\resultado.txt"

Write-Host "Pasta base: $pastaBase"
Write-Host "Pasta destino: $pastaDestino"

# Cria pasta destino se não existir
if (!(Test-Path $pastaDestino)) {
    Write-Host "Criando pasta destino..."
    New-Item -ItemType Directory -Path $pastaDestino | Out-Null
} else {
    Write-Host "Pasta destino já existe."
}

# Pega todos os arquivos, EXCETO dentro da subpasta destino
$arquivos = Get-ChildItem -Path $pastaBase -File | Where-Object { $_.FullName -notlike "*IAPROGRAMMING*" }

if ($arquivos.Count -eq 0) {
    Write-Host "Nenhum arquivo encontrado para concatenar!"
} else {
    # Limpa/cria arquivo
    "" | Out-File -Encoding UTF8 $arquivoDestino

    foreach ($arquivo in $arquivos) {
        Write-Host "Adicionando: $($arquivo.Name)"
        Get-Content $arquivo.FullName | Out-File -Append -Encoding UTF8 $arquivoDestino
    }

    Write-Host "Arquivo concatenado salvo em: $arquivoDestino"
}

# PAUSA o script para ver o resultado
Write-Host ""
Write-Host "Pressione ENTER para sair..."
Read-Host
