# vitorHome 🏠

Startpage pessoal — fundo em vídeo/imagem (local), busca com efeito de digitação,
dock de apps e um bloco de **Portais Digitais**. Tudo personalizável pelo botão de
engrenagem (canto inferior esquerdo) e salvo no próprio navegador.

## Estrutura
```
vitorHome/
├── index.html            # marcação
├── assets/style.css      # visual (glassmorphism, responsivo)
├── assets/app.js         # lógica (config, storage, typewriter, ajustes)
├── media/                # vídeos de fundo e ícones locais
├── nginx.conf            # config do servidor estático
└── docker-compose.yml    # container para subir na VPS
```

## Personalização (na própria página)
Clique na **engrenagem** → abas:
- **Aparência** — troca o fundo (Vídeo 1/2, **enviar arquivo local**, link ou gradiente),
  escurecer, blur, cor de destaque, relógio 12/24h.
- **Busca** — nome da saudação, buscador padrão e as **frases do efeito de digitação**.
- **Apps** — liga/desliga, edita, reordena e adiciona ícones do menu lateral.
- **Portais** — o bloco central de cards (nome, link, ícone, descrição, cor).
- **Backup** — exporta/importa as configurações em JSON e restaura o padrão.

> As configurações ficam em `localStorage` e o fundo enviado em `IndexedDB` —
> ou seja, **por navegador**. Use *Exportar* para levar de um lado a outro.

## Subir na VPS (Docker + nginx-proxy-manager)
Já roda junto dos outros projetos, na rede externa `solveweb-site_web`.

```bash
cd /root/projetos/vitorHome
docker compose up -d          # sobe o container 'vitorhome'
docker compose down           # derruba (não afeta os outros)
```
Teste direto: `http://<ip-da-vps>:8886`

Para publicar num domínio, no **nginx-proxy-manager** (porta 81) crie um *Proxy Host*:
- **Domain**: ex. `home.solveweb.com.br`
- **Forward Hostname**: `vitorhome`  ·  **Forward Port**: `80`  ·  **Scheme**: `http`
- Aba SSL: *Request a new certificate* + *Force SSL* (opcional)
- (Opcional) Access List para proteger com senha, já que é uma página pessoal.

## Editar conteúdo
É estático com bind-mount: basta editar os arquivos da pasta — não precisa
rebuildar imagem. Um refresh no navegador já mostra as mudanças.
