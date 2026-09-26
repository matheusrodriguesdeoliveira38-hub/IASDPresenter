# Automação de mesas digitais

Na versão desktop, abra **Configurações > Automação > Mesas de som**, clique em **Adicionar mesa**, escolha o modelo e informe seu endereço na rede local. Teste a conexão e salve a automação.

| Modelos | Conexão | Alvos disponíveis |
| --- | --- | --- |
| Soundcraft Ui12 / Ui16 / Ui24R | Soundcraft Ui, por WebSocket | Entradas (8 / 12 / 24), Line In L/R e Master |
| Behringer X32 / Midas M32 | OSC, UDP 10023 | Entradas 1–32 e Master estéreo |
| Behringer X Air XR12 / XR16 | OSC, UDP 10024 | Entradas 1–12 / 1–16, Aux estéreo e Master |
| Behringer X Air XR18 / X18 | OSC, UDP 10024 | Entradas 1–16, Aux estéreo 17/18 e Master |

Cada ação tem sua própria **Mesa de destino**. Use **Adicionar ação** para combinar mesas em um gatilho. As ações são executadas na ordem da lista. A configuração antiga da Ui16 mantém seus identificadores e vínculos.

Os comandos disponíveis são volume, fade, mute e desmute. No Master Soundcraft, a integração oferece volume e fade; mute/desmute estão disponíveis nos canais. O volume aceita -90 a +10 dB, e o fade aceita até 60 segundos. Nos modelos OSC, -90 dB corresponde ao fader totalmente fechado.

**Volume ao encerrar** aplica o volume final configurado quando a mídia termina, após concluir um fade que já esteja em andamento. A restauração usa a mesa original da ação, mesmo se seu cadastro for editado durante a reprodução.

Uma mesa usada por ações só pode ser removida após reatribuir ou remover essas ações. Para as mesas OSC, o teste exige resposta a `/info`; os comandos consultam o estado aplicado antes de informar sucesso. Porta fechada, ausência de resposta ou estado divergente são reportados como falha.

## Validação

Há testes automatizados com servidores UDP locais para formato OSC, destinos, escala de volume, mute/desmute, fade, confirmação e timeout. Testes de configuração e execução cobrem migração da Ui16, várias mesas, restauração e ordenação entre fade e término da mídia. A validação com equipamentos físicos ainda é necessária.

## Referências de protocolo

- [Biblioteca Soundcraft Ui](https://fmalcher.github.io/soundcraft-ui/)
- [Protocolo X Air publicado pelo fabricante](https://media.discopiu.com/files/2022/3/25/864756-original.pdf)
- [Documentação e ferramentas X32/M32 de Patrick-Gilles Maillot](https://github.com/pmaillot/X32-Behringer)
