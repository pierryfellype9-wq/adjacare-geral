# WhatsApp — armazenamento dos hinos no Google Drive

O recebimento dos hinos aceita duas formas de autenticação.

## Opção recomendada para uma pasta no “Meu Drive”

Configure no projeto da Vercel:

- `GOOGLE_DRIVE_CLIENT_ID`
- `GOOGLE_DRIVE_CLIENT_SECRET`
- `GOOGLE_DRIVE_REFRESH_TOKEN`
- `DRIVE_PASTA_HINOS` com o ID da pasta principal

As três primeiras variáveis devem pertencer à conta Google da igreja. Essa conta será proprietária dos arquivos e usará a própria cota de armazenamento.

O OAuth precisa autorizar o escopo:

`https://www.googleapis.com/auth/drive`

## Alternativa para Google Workspace

É possível manter `GOOGLE_SERVICE_KEY` quando `DRIVE_PASTA_HINOS` estiver dentro de um Drive Compartilhado. Adicione o e-mail da conta de serviço como “Administrador de conteúdo” ou “Colaborador” nesse Drive.

Compartilhar apenas uma pasta comum do “Meu Drive” com a conta de serviço não é suficiente: contas de serviço não possuem cota própria para armazenar arquivos.

## Prioridade

Quando as variáveis OAuth estiverem configuradas, o sistema usa a conta Google da igreja. Caso contrário, tenta `GOOGLE_SERVICE_KEY`.
