<template>
  <div class="manual-experience">
    <aside class="manual-rail">
      <div class="rail-brand">
        <div class="rail-brand-icon">
          <v-icon icon="mdi-book-open-variant" size="25" />
        </div>
        <div>
          <span>Central de ajuda</span>
          <strong>Manual de uso</strong>
        </div>
      </div>

      <div class="rail-progress">
        <div class="rail-progress-label">
          <span>Exploração do manual</span>
          <strong>{{ progress }}%</strong>
        </div>
        <div class="rail-progress-track">
<span :style="{ width: `${progress}%` }" />
</div>
        <small>{{ visitedTopics.length }} de {{ totalTopics }} tópicos consultados</small>
      </div>

      <nav class="rail-nav" aria-label="Seções do manual">
        <button
          v-for="section in manualSections"
          :key="section.id"
          type="button"
          class="rail-nav-item"
          :class="{ active: selectedSectionId === section.id && !search }"
          @click="selectSection(section.id)"
        >
          <span class="rail-nav-icon"><v-icon :icon="section.icon" size="19" /></span>
          <span class="rail-nav-copy"><strong>{{ section.title }}</strong><small>{{ section.topics.length }} tópicos</small></span>
          <v-icon icon="mdi-chevron-right" size="18" class="rail-nav-arrow" />
        </button>
      </nav>

      <div class="rail-footer">
        <v-icon icon="mdi-lightbulb-on-outline" size="19" />
        <span>Use a busca para encontrar qualquer recurso ou problema.</span>
      </div>
    </aside>

    <main class="manual-workspace">
      <div class="manual-topline">
        <div class="manual-breadcrumb">
          <v-icon icon="mdi-home-outline" size="17" />
          <span>Ajuda</span><v-icon icon="mdi-chevron-right" size="15" /><strong>Manual</strong>
        </div>
        <button type="button" class="manual-close" @click="$emit('close')">
          <v-icon icon="mdi-arrow-left" size="18" /><span>Voltar para Ajuda e sobre</span>
        </button>
      </div>

      <section class="manual-hero">
        <div class="hero-orb hero-orb-one" /><div class="hero-orb hero-orb-two" />
        <div class="hero-copy">
          <span class="hero-kicker"><v-icon icon="mdi-sparkles" size="15" /> GUIA COMPLETO • VERSÃO {{ appVersion }}</span>
          <h1>Domine o IASDPresenter.</h1>
          <p>Respostas claras e práticas para preparar, apresentar e controlar cada momento da programação.</p>
          <div class="hero-metrics">
            <div><strong>{{ manualSections.length }}</strong><span>categorias</span></div>
            <i /><div><strong>{{ totalTopics }}</strong><span>guias práticos</span></div>
            <i /><div><strong>100%</strong><span>dentro do app</span></div>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="hero-art-card back">
<v-icon icon="mdi-monitor-dashboard" />
</div>
          <div class="hero-art-card front">
<v-icon icon="mdi-play-circle-outline" /><span />
</div>
          <div class="hero-art-dot">
<v-icon icon="mdi-check-bold" />
</div>
        </div>
      </section>

      <div class="search-wrap" :class="{ focused: searchFocused }">
        <v-icon icon="mdi-magnify" size="24" />
        <input
          v-model="search"
          type="search"
          placeholder="O que você quer aprender? Ex.: projetor, Bíblia, controle remoto..."
          aria-label="Pesquisar no manual"
          @focus="searchFocused = true"
          @blur="searchFocused = false"
        />
        <span v-if="!search" class="search-shortcut">CTRL + K</span>
        <button v-else type="button" class="search-clear" aria-label="Limpar pesquisa" @click="clearSearch">
<v-icon icon="mdi-close" size="17" />
</button>
      </div>

      <div v-if="!search && selectedSectionId === manualSections[0].id" class="quick-start">
        <div class="block-heading">
<div><span>COMECE POR AQUI</span><h2>Acesso rápido</h2></div><p>Os guias mais procurados por quem está preparando uma apresentação.</p>
</div>
        <div class="quick-grid">
          <button v-for="card in quickCards" :key="card.topicId" type="button" class="quick-card" @click="openQuickTopic(card)">
            <span class="quick-card-icon" :class="card.tone"><v-icon :icon="card.icon" size="25" /></span>
            <span class="quick-card-copy"><strong>{{ card.title }}</strong><small>{{ card.description }}</small></span>
            <span class="quick-card-arrow"><v-icon icon="mdi-arrow-top-right" size="18" /></span>
          </button>
        </div>
      </div>

      <div v-if="search" class="result-banner">
        <div><v-icon icon="mdi-text-search" size="20" /><span><strong>{{ filteredTopics.length }}</strong> {{ filteredTopics.length === 1 ? 'resultado' : 'resultados' }} para “{{ search }}”</span></div>
        <button type="button" @click="clearSearch">
Limpar busca
</button>
      </div>

      <div v-if="activeSections.length" class="manual-content">
        <article v-for="section in activeSections" :key="section.id" class="guide-section">
          <div class="guide-heading">
            <div class="guide-heading-icon">
<v-icon :icon="section.icon" size="27" />
</div>
            <div class="guide-heading-copy">
<span>GUIA DE RECURSOS</span><h2>{{ section.title }}</h2><p>{{ section.description }}</p>
</div>
            <div class="guide-actions">
              <span>{{ section.topics.length }} {{ section.topics.length === 1 ? 'tópico' : 'tópicos' }}</span>
              <button type="button" @click="toggleSection(section)">
{{ isSectionOpen(section) ? 'Recolher' : 'Expandir tudo' }}
</button>
            </div>
          </div>

          <v-expansion-panels v-model="openTopics" multiple class="guide-panels" @update:model-value="recordVisited">
            <v-expansion-panel v-for="(topic, index) in section.topics" :key="topic.id" :value="topic.id" elevation="0">
              <v-expansion-panel-title>
                <div class="guide-topic">
                  <span class="guide-topic-number">{{ String(index + 1).padStart(2, '0') }}</span>
                  <span class="guide-topic-icon"><v-icon :icon="topic.icon" size="22" /></span>
                  <span class="guide-topic-copy"><strong>{{ topic.title }}</strong><small>{{ topic.summary }}</small></span>
                  <v-chip v-if="visitedTopics.includes(topic.id)" size="x-small" color="success" variant="tonal" class="read-chip">
<v-icon start icon="mdi-check" />Visto
</v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <div class="topic-body">
                  <div v-if="topic.steps?.length" class="topic-steps">
                    <div class="topic-body-label">
<v-icon icon="mdi-format-list-checks" size="18" /> Passo a passo
</div>
                    <div v-for="(step, stepIndex) in topic.steps" :key="`${topic.id}-${stepIndex}`" class="topic-step">
                      <span>{{ stepIndex + 1 }}</span><p>{{ step }}</p>
                    </div>
                  </div>
                  <div v-if="topic.details?.length" class="topic-details">
                    <div v-for="detail in topic.details" :key="detail" class="topic-detail">
<v-icon icon="mdi-check-circle-outline" size="18" /><span>{{ detail }}</span>
</div>
                  </div>
                  <div v-for="tip in topic.tips || []" :key="tip" class="topic-callout tip">
<v-icon icon="mdi-lightbulb-on-outline" size="21" /><div><strong>Dica de operação</strong><span>{{ tip }}</span></div>
</div>
                  <div v-if="topic.warning" class="topic-callout warning">
<v-icon icon="mdi-alert-outline" size="21" /><div><strong>Atenção</strong><span>{{ topic.warning }}</span></div>
</div>
                  <div v-if="topic.moduleId" class="topic-footer">
                    <v-btn color="primary" variant="flat" rounded="lg" class="text-none font-weight-bold" prepend-icon="mdi-open-in-app" @click="$emit('open-module', topic.moduleId)">
{{ topic.actionLabel || 'Abrir no aplicativo' }}
</v-btn>
                    <span>Você continuará exatamente de onde parou.</span>
                  </div>
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </article>
      </div>

      <div v-else class="manual-empty">
        <div class="empty-illustration">
<v-icon icon="mdi-file-search-outline" size="45" />
</div>
        <span>NENHUM RESULTADO</span><h2>Não encontramos esse assunto.</h2>
        <p>Tente uma palavra mais simples, como “tela”, “música”, “Bíblia” ou “áudio”.</p>
        <v-btn color="primary" variant="tonal" class="text-none" @click="clearSearch">
Limpar pesquisa
</v-btn>
      </div>
    </main>
  </div>
</template>

<script lang="ts">
import packageJson from "../../../../../package.json";
import { manualSections, type ManualSection, type ManualTopic } from "./manual";

interface QuickCard { sectionId: string; topicId: string; title: string; description: string; icon: string; tone: string }
const normalize = (value: string | null | undefined) => (value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
const matches = (topic: ManualTopic, query: string) => normalize([topic.title, topic.summary, ...(topic.steps || []), ...(topic.details || []), ...(topic.tips || []), topic.warning || "", ...(topic.keywords || [])].join(" ")).includes(query);

export default {
  name: "ManualView",
  emits: ["close", "open-module"],
  data: () => ({
    manualSections,
    selectedSectionId: manualSections[0].id,
    search: "",
    searchFocused: false,
    openTopics: [] as string[],
    visitedTopics: [] as string[],
    quickCards: [
      { sectionId: "primeiros-passos", topicId: "configuracao-inicial", title: "Configuração inicial", description: "Prepare telas, tema e mídia", icon: "mdi-tune-variant", tone: "blue" },
      { sectionId: "projecao", topicId: "configurar-telas", title: "Configurar projeção", description: "Escolha projetor e retorno", icon: "mdi-monitor-multiple", tone: "violet" },
      { sectionId: "solucoes", topicId: "checklist", title: "Checklist do culto", description: "Revise tudo antes de começar", icon: "mdi-clipboard-check-outline", tone: "amber" },
    ] as QuickCard[],
  }),
  computed: {
    appVersion() { return packageJson.version; },
    totalTopics() { return manualSections.reduce((total, section) => total + section.topics.length, 0); },
    progress() { return this.totalTopics ? Math.round((this.visitedTopics.length / this.totalTopics) * 100) : 0; },
    filteredTopics(): ManualTopic[] {
      const query = normalize(this.search);
      return query ? manualSections.flatMap((section) => section.topics.filter((topic) => matches(topic, query))) : [];
    },
    activeSections(): ManualSection[] {
      const query = normalize(this.search);
      if (query) return manualSections.map((section) => ({ ...section, topics: section.topics.filter((topic) => matches(topic, query)) })).filter((section) => section.topics.length);
      return manualSections.filter((section) => section.id === this.selectedSectionId);
    },
  },
  watch: {
    search(value: string) { this.openTopics = value.trim() ? this.filteredTopics.map((topic) => topic.id) : []; },
  },
  mounted() { window.addEventListener("keydown", this.handleShortcut); },
  beforeUnmount() { window.removeEventListener("keydown", this.handleShortcut); },
  methods: {
    handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        (this.$el.querySelector(".search-wrap input") as HTMLInputElement)?.focus();
      }
    },
    selectSection(sectionId: string) {
      this.search = ""; this.selectedSectionId = sectionId; this.openTopics = [];
      this.$nextTick(() => this.$el.querySelector(".manual-workspace")?.scrollTo({ top: 0, behavior: "smooth" }));
    },
    clearSearch() { this.search = ""; this.openTopics = []; },
    recordVisited(values: string[]) {
      values.forEach((id) => { if (!this.visitedTopics.includes(id)) this.visitedTopics.push(id); });
    },
    isSectionOpen(section: ManualSection) { return section.topics.every((topic) => this.openTopics.includes(topic.id)); },
    toggleSection(section: ManualSection) {
      const ids = section.topics.map((topic) => topic.id);
      if (this.isSectionOpen(section)) this.openTopics = this.openTopics.filter((id) => !ids.includes(id));
      else this.openTopics = [...new Set([...this.openTopics, ...ids])];
    },
    openQuickTopic(card: QuickCard) {
      this.selectedSectionId = card.sectionId; this.openTopics = [card.topicId];
      if (!this.visitedTopics.includes(card.topicId)) this.visitedTopics.push(card.topicId);
      this.$nextTick(() => this.$el.querySelector(".manual-content")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
  },
};
</script>

<style scoped>
.manual-experience { --manual-blue: var(--accent-blue, #0097d7); height: 100%; display: grid; grid-template-columns: 284px minmax(0, 1fr); overflow: hidden; background: var(--main-bg); }
.manual-rail { min-height: 0; padding: 22px 16px 16px; display: flex; flex-direction: column; background: color-mix(in srgb, var(--card-bg) 88%, var(--manual-blue) 2%); border-right: 1px solid var(--border-color); box-shadow: 12px 0 35px rgba(19, 41, 66, .035); }
.rail-brand { padding: 0 8px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-color); }
.rail-brand-icon { width: 43px; height: 43px; display: grid; place-items: center; color: white; border-radius: 13px; background: linear-gradient(145deg, color-mix(in srgb, var(--manual-blue) 78%, #fff), var(--manual-blue)); box-shadow: 0 9px 22px color-mix(in srgb, var(--manual-blue) 24%, transparent); }
.rail-brand div:last-child { display: flex; flex-direction: column; }.rail-brand span { color: var(--sidebar-text-secondary); font-size: 11px; }.rail-brand strong { color: var(--sidebar-text); font-size: 15px; }
.rail-progress { margin: 18px 6px 12px; padding: 14px; border-radius: 14px; color: var(--sidebar-text); background: color-mix(in srgb, var(--manual-blue) 7%, var(--card-bg)); border: 1px solid color-mix(in srgb, var(--manual-blue) 13%, var(--border-color)); }
.rail-progress-label { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; }.rail-progress-label strong { color: var(--manual-blue); }.rail-progress-track { height: 5px; margin: 9px 0 7px; overflow: hidden; border-radius: 99px; background: color-mix(in srgb, var(--manual-blue) 12%, var(--border-color)); }.rail-progress-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--manual-blue), color-mix(in srgb, var(--manual-blue) 55%, #8b5cf6)); transition: width .3s ease; }.rail-progress small { color: var(--sidebar-text-secondary); font-size: 10px; }
.rail-nav { min-height: 0; padding: 5px 2px; display: flex; flex: 1; flex-direction: column; gap: 4px; overflow-y: auto; }
.rail-nav-item { width: 100%; padding: 9px 9px; display: grid; grid-template-columns: 35px minmax(0, 1fr) 18px; align-items: center; gap: 9px; color: var(--sidebar-text-secondary); border: 0; border-radius: 12px; background: transparent; cursor: pointer; text-align: left; transition: .18s ease; }.rail-nav-item:hover { color: var(--sidebar-text); background: color-mix(in srgb, var(--manual-blue) 6%, transparent); transform: translateX(2px); }.rail-nav-item.active { color: var(--manual-blue); background: color-mix(in srgb, var(--manual-blue) 10%, transparent); box-shadow: inset 3px 0 var(--manual-blue); }
.rail-nav-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: color-mix(in srgb, currentColor 8%, transparent); }.rail-nav-copy { min-width: 0; display: flex; flex-direction: column; }.rail-nav-copy strong { color: inherit; overflow: hidden; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.rail-nav-copy small { margin-top: 1px; color: var(--sidebar-text-secondary); font-size: 9.5px; }.rail-nav-arrow { opacity: .45; }
.rail-footer { margin-top: 10px; padding: 12px; display: flex; gap: 9px; color: var(--sidebar-text-secondary); border-radius: 12px; background: var(--main-bg); font-size: 10px; line-height: 1.45; }
.manual-workspace { min-width: 0; overflow-y: auto; padding: 18px clamp(22px, 4vw, 58px) 58px; }
.manual-workspace > * { width: 100%; max-width: 1040px; margin-inline: auto; }.manual-topline { margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }.manual-breadcrumb { display: flex; align-items: center; gap: 5px; color: var(--sidebar-text-secondary); font-size: 11px; }.manual-breadcrumb strong { color: var(--sidebar-text); }.manual-close { padding: 7px 11px; display: flex; align-items: center; gap: 7px; color: var(--sidebar-text-secondary); border: 1px solid var(--border-color); border-radius: 9px; background: var(--card-bg); cursor: pointer; font: inherit; font-size: 11px; transition: .18s ease; }.manual-close:hover { color: var(--manual-blue); border-color: color-mix(in srgb, var(--manual-blue) 32%, var(--border-color)); }
.manual-hero { position: relative; min-height: 224px; padding: 34px 40px; display: flex; align-items: center; overflow: hidden; border-radius: 24px; background: linear-gradient(120deg, #061c31 0%, color-mix(in srgb, var(--manual-blue) 52%, #08223b) 58%, #096999 100%); box-shadow: 0 18px 45px rgba(6, 36, 60, .18); }.hero-orb { position: absolute; border-radius: 50%; filter: blur(1px); }.hero-orb-one { width: 280px; height: 280px; right: -70px; top: -130px; background: rgba(93, 214, 255, .16); }.hero-orb-two { width: 170px; height: 170px; left: 42%; bottom: -130px; background: rgba(139, 92, 246, .18); }
.hero-copy { position: relative; z-index: 2; max-width: 640px; }.hero-kicker { display: inline-flex; align-items: center; gap: 6px; color: #8ddeff; font-size: 10px; font-weight: 800; letter-spacing: .14em; }.hero-copy h1 { margin: 9px 0 8px; color: white; font-size: clamp(30px, 4vw, 43px); line-height: 1.08; letter-spacing: -.045em; }.hero-copy p { max-width: 590px; margin: 0; color: rgba(235, 247, 255, .78); font-size: 14px; line-height: 1.6; }.hero-metrics { margin-top: 22px; display: flex; align-items: center; gap: 17px; }.hero-metrics div { display: flex; flex-direction: column; }.hero-metrics strong { color: white; font-size: 17px; }.hero-metrics span { color: rgba(235, 247, 255, .62); font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }.hero-metrics i { width: 1px; height: 26px; background: rgba(255, 255, 255, .16); }
.hero-art { position: absolute; right: 55px; top: 50%; width: 175px; height: 145px; transform: translateY(-50%); }.hero-art-card { position: absolute; display: flex; align-items: center; justify-content: center; color: white; border: 1px solid rgba(255, 255, 255, .2); border-radius: 18px; backdrop-filter: blur(8px); }.hero-art-card.back { width: 120px; height: 82px; right: 0; top: 0; font-size: 35px; background: rgba(255, 255, 255, .08); transform: rotate(8deg); }.hero-art-card.front { width: 138px; height: 94px; left: 0; bottom: 0; flex-direction: column; gap: 10px; font-size: 38px; background: rgba(255, 255, 255, .14); box-shadow: 0 18px 35px rgba(0, 0, 0, .15); transform: rotate(-5deg); }.hero-art-card.front span { width: 67px; height: 5px; border-radius: 9px; background: rgba(255, 255, 255, .35); }.hero-art-dot { position: absolute; right: 2px; bottom: 10px; width: 31px; height: 31px; display: grid; place-items: center; color: white; border: 3px solid #1578a8; border-radius: 50%; background: #34c887; font-size: 13px; }
.search-wrap { position: relative; z-index: 4; height: 60px; margin-top: -18px; padding: 0 17px; display: flex; align-items: center; gap: 12px; color: var(--sidebar-text-secondary); border: 1px solid var(--border-color); border-radius: 16px; background: var(--card-bg); box-shadow: 0 14px 30px rgba(25, 51, 75, .12); transition: .2s ease; }.search-wrap.focused { color: var(--manual-blue); border-color: color-mix(in srgb, var(--manual-blue) 50%, var(--border-color)); box-shadow: 0 14px 34px color-mix(in srgb, var(--manual-blue) 15%, transparent); }.search-wrap input { min-width: 0; height: 100%; flex: 1; color: var(--sidebar-text); border: 0; outline: 0; background: transparent; font: inherit; font-size: 13px; }.search-wrap input::placeholder { color: var(--sidebar-text-secondary); }.search-shortcut { padding: 4px 7px; color: var(--sidebar-text-secondary); border: 1px solid var(--border-color); border-radius: 6px; background: var(--main-bg); font-size: 9px; font-weight: 700; letter-spacing: .06em; }.search-clear { width: 28px; height: 28px; display: grid; place-items: center; color: var(--sidebar-text-secondary); border: 0; border-radius: 50%; background: var(--main-bg); cursor: pointer; }
.quick-start { margin-top: 34px; }.block-heading { margin-bottom: 13px; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; }.block-heading span, .guide-heading-copy > span, .manual-empty > span { color: var(--manual-blue); font-size: 9px; font-weight: 850; letter-spacing: .14em; }.block-heading h2, .guide-heading h2 { margin: 2px 0 0; color: var(--sidebar-text); font-size: 21px; letter-spacing: -.025em; }.block-heading p { max-width: 380px; margin: 0; color: var(--sidebar-text-secondary); font-size: 11px; text-align: right; }
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }.quick-card { min-width: 0; padding: 15px; display: grid; grid-template-columns: 43px minmax(0, 1fr) 28px; align-items: center; gap: 11px; color: var(--sidebar-text); border: 1px solid var(--border-color); border-radius: 15px; background: var(--card-bg); box-shadow: var(--shadow); cursor: pointer; font: inherit; text-align: left; transition: .2s ease; }.quick-card:hover { border-color: color-mix(in srgb, var(--manual-blue) 25%, var(--border-color)); box-shadow: 0 14px 30px rgba(25, 51, 75, .1); transform: translateY(-3px); }.quick-card-icon { width: 43px; height: 43px; display: grid; place-items: center; border-radius: 12px; }.quick-card-icon.blue { color: #038cca; background: rgba(0, 151, 215, .1); }.quick-card-icon.violet { color: #7c5ce5; background: rgba(124, 92, 229, .1); }.quick-card-icon.amber { color: #d38b0a; background: rgba(246, 170, 32, .12); }.quick-card-copy { min-width: 0; display: flex; flex-direction: column; }.quick-card-copy strong { font-size: 12px; }.quick-card-copy small { margin-top: 3px; overflow: hidden; color: var(--sidebar-text-secondary); font-size: 9.5px; text-overflow: ellipsis; white-space: nowrap; }.quick-card-arrow { width: 28px; height: 28px; display: grid; place-items: center; color: var(--sidebar-text-secondary); border-radius: 9px; background: var(--main-bg); }
.result-banner { margin-top: 25px; padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; gap: 14px; color: var(--sidebar-text-secondary); border: 1px solid color-mix(in srgb, var(--manual-blue) 18%, var(--border-color)); border-radius: 12px; background: color-mix(in srgb, var(--manual-blue) 6%, var(--card-bg)); font-size: 11px; }.result-banner div { display: flex; align-items: center; gap: 8px; }.result-banner strong { color: var(--manual-blue); }.result-banner button, .guide-actions button { color: var(--manual-blue); border: 0; background: transparent; cursor: pointer; font: inherit; font-size: 10px; font-weight: 750; }
.manual-content { margin-top: 34px; scroll-margin-top: 15px; }.guide-section + .guide-section { margin-top: 40px; padding-top: 34px; border-top: 1px solid var(--border-color); }.guide-heading { margin-bottom: 15px; display: grid; grid-template-columns: 49px minmax(0, 1fr) auto; align-items: center; gap: 14px; }.guide-heading-icon { width: 49px; height: 49px; display: grid; place-items: center; color: var(--manual-blue); border-radius: 14px; background: color-mix(in srgb, var(--manual-blue) 10%, transparent); }.guide-heading-copy h2 { font-size: 20px; }.guide-heading-copy p { margin: 2px 0 0; color: var(--sidebar-text-secondary); font-size: 11px; }.guide-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }.guide-actions span { color: var(--sidebar-text-secondary); font-size: 9px; }
.guide-panels { width: 100%; display: flex !important; flex-direction: column; align-items: stretch; gap: 9px; }.guide-panels :deep(.v-expansion-panel) { width: 100% !important; max-width: 100% !important; flex: 0 0 auto !important; overflow: hidden; color: var(--sidebar-text); border: 1px solid var(--border-color); border-radius: 15px !important; background: var(--card-bg); box-shadow: 0 5px 17px rgba(28, 50, 71, .045); transition: border-color .2s ease, box-shadow .2s ease; }.guide-panels :deep(.v-expansion-panel--active) { border-color: color-mix(in srgb, var(--manual-blue) 25%, var(--border-color)); box-shadow: 0 12px 30px rgba(28, 50, 71, .08); }.guide-panels :deep(.v-expansion-panel-title) { min-height: 76px; padding: 13px 17px; }.guide-panels :deep(.v-expansion-panel-text__wrapper) { padding: 0 22px 23px 92px; }
.guide-topic { width: 100%; min-width: 0; display: grid; grid-template-columns: 25px 41px minmax(0, 1fr) auto; align-items: center; gap: 11px; }.guide-topic-number { color: var(--sidebar-text-secondary); font-size: 9px; font-weight: 800; letter-spacing: .08em; }.guide-topic-icon { width: 41px; height: 41px; display: grid; place-items: center; color: var(--manual-blue); border-radius: 12px; background: color-mix(in srgb, var(--manual-blue) 9%, transparent); }.guide-topic-copy { min-width: 0; display: flex; flex-direction: column; }.guide-topic-copy strong { color: var(--sidebar-text); font-size: 13px; }.guide-topic-copy small { margin-top: 3px; overflow: hidden; color: var(--sidebar-text-secondary); font-size: 10.5px; text-overflow: ellipsis; white-space: nowrap; }.read-chip { margin-right: 7px; font-size: 8px; }
.topic-body { padding-top: 2px; border-top: 1px solid var(--border-color); }.topic-body-label { margin: 16px 0 12px; display: flex; align-items: center; gap: 7px; color: var(--sidebar-text); font-size: 11px; font-weight: 750; }.topic-steps { display: grid; gap: 0; }.topic-step { position: relative; min-height: 40px; display: grid; grid-template-columns: 27px minmax(0, 1fr); gap: 11px; color: var(--sidebar-text-secondary); font-size: 11.5px; line-height: 1.55; }.topic-step:not(:last-child)::after { content: ""; position: absolute; left: 12.5px; top: 27px; bottom: 2px; width: 1px; background: color-mix(in srgb, var(--manual-blue) 18%, var(--border-color)); }.topic-step > span { position: relative; z-index: 1; width: 26px; height: 26px; display: grid; place-items: center; color: white; border-radius: 50%; background: var(--manual-blue); font-size: 9px; font-weight: 800; }.topic-step p { margin: 3px 0 13px; }.topic-details { padding-top: 15px; display: grid; gap: 9px; }.topic-detail { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 8px; color: var(--sidebar-text-secondary); font-size: 11.5px; line-height: 1.5; }.topic-detail .v-icon { color: #26a66f; }
.topic-callout { margin-top: 14px; padding: 12px 13px; display: flex; gap: 10px; border-radius: 11px; font-size: 10.5px; line-height: 1.5; }.topic-callout div { display: flex; flex-direction: column; gap: 1px; }.topic-callout.tip { color: color-mix(in srgb, var(--sidebar-text) 88%, #765600); border: 1px solid rgba(232, 170, 30, .2); background: color-mix(in srgb, #f4b72a 9%, var(--card-bg)); }.topic-callout.warning { color: color-mix(in srgb, var(--sidebar-text) 88%, #933f28); border: 1px solid rgba(239, 104, 65, .2); background: color-mix(in srgb, #ef6841 8%, var(--card-bg)); }.topic-footer { margin-top: 17px; padding-top: 15px; display: flex; align-items: center; gap: 13px; border-top: 1px dashed var(--border-color); }.topic-footer span { color: var(--sidebar-text-secondary); font-size: 9.5px; }
.manual-empty { padding: 70px 20px; display: flex; flex-direction: column; align-items: center; text-align: center; }.empty-illustration { width: 92px; height: 92px; margin-bottom: 18px; display: grid; place-items: center; color: var(--manual-blue); border-radius: 28px; background: color-mix(in srgb, var(--manual-blue) 9%, transparent); transform: rotate(-4deg); }.manual-empty h2 { margin: 5px 0 6px; color: var(--sidebar-text); font-size: 22px; }.manual-empty p { margin: 0 0 18px; color: var(--sidebar-text-secondary); font-size: 12px; }
@media (max-width: 1050px) { .manual-experience { grid-template-columns: 235px minmax(0, 1fr); }.hero-art { opacity: .55; right: 25px; }.hero-copy { max-width: 70%; }.quick-grid { grid-template-columns: 1fr; }.quick-card-copy small { white-space: normal; } }
@media (max-width: 780px) { .manual-experience { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }.manual-rail { padding: 10px 12px; flex-direction: row; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--border-color); }.rail-brand, .rail-progress, .rail-footer { display: none; }.rail-nav { padding: 0; flex-direction: row; overflow-x: auto; overflow-y: hidden; }.rail-nav-item { width: auto; min-width: max-content; grid-template-columns: 31px auto; }.rail-nav-icon { width: 31px; height: 31px; }.rail-nav-copy small, .rail-nav-arrow { display: none; }.manual-workspace { padding: 14px 14px 40px; }.hero-art { display: none; }.hero-copy { max-width: none; }.manual-hero { min-height: 210px; padding: 28px; }.guide-panels :deep(.v-expansion-panel-text__wrapper) { padding: 0 16px 20px; } }
@media (max-width: 560px) { .manual-close span, .manual-breadcrumb span, .manual-breadcrumb .v-icon:nth-of-type(2) { display: none; }.manual-hero { min-height: 230px; padding: 24px 22px 34px; }.hero-copy h1 { font-size: 30px; }.hero-metrics { gap: 10px; }.search-wrap { height: 56px; margin-top: -15px; }.search-shortcut { display: none; }.block-heading { align-items: flex-start; flex-direction: column; }.block-heading p { text-align: left; }.guide-heading { grid-template-columns: 45px minmax(0, 1fr); }.guide-actions { grid-column: 2; align-items: flex-start; flex-direction: row; }.guide-topic { grid-template-columns: 36px minmax(0, 1fr); }.guide-topic-number, .read-chip { display: none; }.guide-topic-icon { width: 36px; height: 36px; }.guide-topic-copy small { white-space: normal; }.topic-footer { align-items: flex-start; flex-direction: column; } }
</style>
