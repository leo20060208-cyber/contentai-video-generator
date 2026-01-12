$url = "https://github.com/stripe/stripe-cli/releases/download/v1.23.1/stripe_1.23.1_windows_x86_64.zip"
$output = "stripe.zip"
$destination = "."

Write-Host "Downloading Stripe CLI..."
Invoke-WebRequest -Uri $url -OutFile $output

Write-Host "Extracting..."
Expand-Archive -Path $output -DestinationPath $destination -Force

Write-Host "Cleaning up..."
Remove-Item $output

Write-Host "Done! You can now use .\stripe.exe"
