<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" class="module-full-page dashboard-home d-flex flex-column bg-main config-page">
      <header class="search-header config-header flex-shrink-0">
        <div class="config-title-group">
          <MenuToggleButton class="flex-shrink-0" @toggle-sidebar="toggleSidebar" />
          <div class="module-icon-box d-flex align-center justify-center flex-shrink-0">
            <v-icon :icon="manifest.icon || 'mdi-cog'" size="24" />
          </div>
          <div>
            <h2 class="section-title">{{ t('main_title') }}</h2>
            <p>{{ activeTabDescription }}</p>
          </div>
        </div>

        <nav class="config-tabs" aria-label="Categorias de configurações">
          <button v-for="item in configTabs" :key="item.value" type="button" :class="{ active: tab === item.value }" @click="tab = item.value">
            <v-icon :icon="item.icon" size="18" />
            <span>{{ item.label }}</span>
          </button>
        </nav>
      </header>

      <div class="content-main config-content flex-grow-1 w-100">
        <v-tabs-window v-model="tab" class="h-100 w-100">
          <v-tabs-window-item :value="1" class="h-100">
            <div class="h-100 overflow-auto px-6 pb-6">
              <div class="settings-container mx-auto pb-4" style="max-width: 600px;">
                <CollapsiblePanel :title="t('system_theme')" :subtitle="t('system_theme_desc')" icon="mdi-palette" class="mb-6">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2 mb-6" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center mb-6">
                      <v-icon color="primary" class="mr-3" size="28">
                        mdi-palette
                      </v-icon>
                      <div>
                        <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                          {{ t('system_theme') }}
                        </h3>
                        <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                          {{ t('system_theme_desc') }}
                        </div>
                      </div>
                    </div>
                    
                    <ConfigMiniPreview
                      variant="theme"
                      label="Compare os temas antes de escolher"
                      :active-theme="active_theme_mode"
                      :accent-color="accent_color"
                      @select-theme="active_theme_mode = $event"
                    />

                    <v-divider class="my-8" style="opacity: 0.1;" />

                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center mr-4">
                        <v-icon color="primary" class="mr-3" size="24">
                          mdi-format-color-fill
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('accent_color') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            {{ t('accent_color_desc') }}
                          </div>
                        </div>
                      </div>
                      <div class="d-flex align-center" style="gap: 12px;">
                        <span class="text-caption font-weight-bold" style="color: var(--sidebar-text-secondary); min-width: 72px; text-align: right;">
                          {{ accent_color.toUpperCase() }}
                        </span>
                        <ModernColorPicker v-model="accent_color" />
                      </div>
                    </div>

                    <v-divider class="my-8" style="opacity: 0.1;" />

                    <div>
                      <div class="d-flex align-center mb-4">
                        <v-icon color="primary" class="mr-3" size="24">
                          mdi-view-dashboard
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('home_layout') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            {{ t('home_layout_desc') }}
                          </div>
                        </div>
                      </div>

                      <v-btn-toggle
                        v-model="home_layout"
                        color="primary"
                        variant="tonal"
                        mandatory
                        class="rounded-xl w-100 d-flex"
                        style="min-height: 48px; background: var(--card-bg); box-shadow: inset 0 0 0 1px var(--border-color);"
                      >
                        <v-btn value="classic" class="flex-grow-1 text-none font-weight-bold">
                          <v-icon start size="20">
                            mdi-magnify
                          </v-icon>
                          {{ t('home_layout_classic') }}
                        </v-btn>
                        <v-btn value="launcher" class="flex-grow-1 text-none font-weight-bold">
                          <v-icon start size="20">
                            mdi-apps
                          </v-icon>
                          {{ t('home_layout_launcher') }}
                        </v-btn>
                      </v-btn-toggle>
                    </div>

                    <v-divider class="my-8" style="opacity: 0.1;" />

                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center mr-4">
                        <v-icon color="primary" class="mr-3" size="24">
                          mdi-dock-left
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('sidebar_auto_collapse') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            {{ t('sidebar_auto_collapse_desc') }}
                          </div>
                        </div>
                      </div>
                      <v-switch
                        v-model="sidebar_auto_collapse"
                        color="primary"
                        inset
                        hide-details
                        class="font-weight-medium"
                      />
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>
              </div>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item :value="2" class="h-100">
            <div class="h-100 overflow-auto px-6 pb-6">
              <div class="settings-container mx-auto d-flex flex-column" style="max-width: 600px; gap: 24px;">
                <CollapsiblePanel title="Preferências gerais" subtitle="Idioma, tela inicial e desempenho" icon="mdi-tune-variant" :hide-first="false">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2 mb-6" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <!-- IDIOMA -->
                    <div class="d-flex align-center justify-space-between mb-8">
                      <div class="d-flex align-center">
                        <v-icon color="primary" class="mr-3" size="24">
                          mdi-translate
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('language') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            {{ t('language_desc') }}
                          </div>
                        </div>
                      </div>
                      <v-menu :close-on-content-click="true" location="bottom end">
                        <template #activator="{ props }">
                          <v-btn
                            v-bind="props"
                            variant="tonal"
                            color="primary"
                            rounded="lg"
                            class="text-none px-4"
                            style="height: 44px; min-width: 140px;"
                          >
                            <div class="d-flex align-center justify-space-between w-100">
                              <span class="text-truncate font-weight-bold text-body-2 mr-2">
                                {{ languageName }}
                              </span>
                              <v-icon size="small">
                                mdi-menu-down
                              </v-icon>
                            </div>
                          </v-btn>
                        </template>
                        <v-card class="mt-1" rounded="lg" style="background: var(--card-bg); box-shadow: var(--shadow); border: 1px solid var(--border-color); min-width: 140px;">
                          <v-list class="py-1" bg-color="transparent">
                            <v-list-item
                              v-for="item in languagesList"
                              :key="item.code"
                              :active="item.code === language"
                              color="primary"
                              class="mx-1 rounded-lg mb-1"
                              style="min-height: 36px;"
                              @click="language = item.code"
                            >
                              <span class="text-body-2 font-weight-bold">{{ item.name }}</span>
                            </v-list-item>
                          </v-list>
                        </v-card>
                      </v-menu>
                    </div>

                    <v-divider class="mb-8" style="opacity: 0.1;" />

                    <!-- HINÁRIO PRINCIPAL -->
                    <div class="d-flex align-center justify-space-between" style="gap: 24px;">
                      <div class="d-flex align-center">
                        <v-icon color="primary" class="mr-3" size="24">
                          mdi-book-music
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('primary_hymnal') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            {{ t('primary_hymnal_desc') }}
                          </div>
                        </div>
                      </div>
                      <v-select
                        v-model="primary_hymnal"
                        :items="primaryHymnalOptions"
                        item-title="title"
                        item-value="value"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        class="flex-shrink-0"
                        style="max-width: 230px;"
                      />
                    </div>

                    <v-divider class="my-8" style="opacity: 0.1;" />

                    <!-- HISTORICO DA TELA INICIAL -->
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center">
                        <v-icon color="primary" class="mr-3" size="24">
                          mdi-history
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('home_history') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            {{ t('home_history_desc') }}
                          </div>
                        </div>
                      </div>
                      <v-switch
                        v-model="show_home_history"
                        color="primary"
                        inset
                        hide-details
                        class="font-weight-medium"
                      />
                    </div>

                    <v-divider class="my-8" style="opacity: 0.1;" />

                    <div>
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center mr-4">
                          <v-icon color="primary" class="mr-3" size="24">
                            mdi-speedometer-slow
                          </v-icon>
                          <div>
                            <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                              Modo leve
                            </h3>
                            <div class="text-caption" style="color: var(--sidebar-text-secondary); line-height: 1.3;">
                              Reduz processamento para computadores mais fracos.
                            </div>
                          </div>
                        </div>
                        <v-switch
                          v-model="light_mode"
                          color="primary"
                          inset
                          hide-details
                          class="font-weight-medium"
                        />
                      </div>

                      <v-expand-transition>
                        <div v-show="light_mode" class="pl-4 mt-4" style="border-left: 2px solid var(--border-color);">
                          <v-switch
                            v-model="light_optimize_presentations"
                            label="Otimizar PDF e apresentações"
                            color="primary"
                            inset
                            hide-details
                            density="compact"
                            class="mb-2"
                          />
                          <v-switch
                            v-model="light_limit_projection_windows"
                            label="Reduzir janelas simultâneas"
                            color="primary"
                            inset
                            hide-details
                            density="compact"
                            class="mb-2"
                          />
                          <v-switch
                            v-model="light_disable_hardware_acceleration"
                            label="Testar sem aceleração de hardware"
                            color="primary"
                            inset
                            hide-details
                            density="compact"
                          />
                          <v-alert
                            v-if="performanceRestartRequired"
                            type="info"
                            variant="tonal"
                            density="compact"
                            class="mt-3 rounded-lg"
                          >
                            <div>
                              {{ light_disable_hardware_acceleration
                                ? 'Reinicie o aplicativo para desativar a aceleração de hardware.'
                                : 'Reinicie o aplicativo para reativar a aceleração de hardware.' }}
                            </div>
                            <div v-if="performance_restart_error" class="text-caption mt-2">
                              {{ performance_restart_error }}
                            </div>
                            <v-btn
                              class="mt-3 text-none"
                              color="primary"
                              variant="flat"
                              size="small"
                              prepend-icon="mdi-restart"
                              :loading="performance_restart_loading"
                              @click="restartForPerformanceChange"
                            >
                              Reiniciar agora
                            </v-btn>
                          </v-alert>
                        </div>
                      </v-expand-transition>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>

                <CollapsiblePanel title="Dados e histórico" subtitle="Limpeza de histórico e dados locais" icon="mdi-database-cog" :hide-first="false">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <!-- RESETAR HISTÓRICO -->
                    <div class="d-flex align-center justify-space-between mb-8">
                      <div class="d-flex align-center mr-4">
                        <v-icon color="error" class="mr-3" size="24">
                          mdi-database-refresh
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold mb-1" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('reset_history') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary); line-height: 1.3;">
                            Limpa as coletâneas recentes e as músicas mais tocadas.
                          </div>
                        </div>
                      </div>
                      <v-btn
                        color="error"
                        variant="tonal"
                        class="rounded-lg text-none px-6 font-weight-bold flex-shrink-0"
                        @click="resetHistory"
                      >
                        Limpar
                      </v-btn>
                    </div>

                    <v-divider class="mb-8" style="opacity: 0.1;" />

                    <!-- LIMPAR TODOS OS DADOS -->
                    <div class="d-flex align-center justify-space-between">
                      <div class="d-flex align-center mr-4">
                        <v-icon color="error" class="mr-3" size="24">
                          mdi-delete-alert
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold mb-1" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            {{ t('clear_data') }}
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary); line-height: 1.3;">
                            Exclui banco de dados e arquivos baixados.
                          </div>
                        </div>
                      </div>
                      <v-btn
                        color="error"
                        variant="flat"
                        class="rounded-lg text-none px-6 font-weight-bold flex-shrink-0"
                        @click="clearAllData"
                      >
                        Apagar Tudo
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>
              </div>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item :value="3" class="h-100">
            <div class="h-100 overflow-auto px-6 pb-6">
              <div class="settings-container mx-auto pb-4" style="max-width: 600px;">
                <CollapsiblePanel title="Reprodução" subtitle="Player interno, transições e comportamento de vídeo" icon="mdi-play-network-outline" class="mb-6 mt-6">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2 mb-6 mt-6" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center mb-4">
                      <v-icon color="primary" class="mr-3" size="28">
                        mdi-play-network-outline
                      </v-icon>
                      <div>
                        <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                          Reprodução
                        </h3>
                      </div>
                    </div>
                    
                    <div class="mt-4">
                      <v-switch
                        v-model="media_use_internal_player"
                        label="Reproduzir mídias internamente"
                        color="primary"
                        hide-details
                        inset
                        class="font-weight-medium mb-2"
                      />

                      <v-expand-transition>
                        <div v-show="media_use_internal_player" class="pl-4 mt-4" style="border-left: 2px solid var(--border-color);">
                          <div class="mb-5">
                            <div class="d-flex align-center justify-space-between mb-1" style="gap: 12px;">
                              <div>
                                <div class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">
                                  Transi&ccedil;&atilde;o entre itens da liturgia
                                </div>
                                <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                                  Fade na proje&ccedil;&atilde;o: metade do tempo para apagar o item atual e metade para revelar o pr&oacute;ximo. 0 s desativa.
                                </div>
                              </div>
                              <v-chip size="small" color="primary" variant="tonal" class="font-weight-bold">
                                {{ Number(media_liturgy_transition_duration).toFixed(1) }} s
                              </v-chip>
                            </div>
                            <v-slider
                              v-model="media_liturgy_transition_duration"
                              color="primary"
                              min="0"
                              max="3"
                              step="0.1"
                              hide-details
                              density="compact"
                            />
                          </div>

                          <v-switch
                            v-model="media_sync_projection_settings"
                            label="Replicar configurações de Projeção & Telas"
                            color="primary"
                            hide-details
                            inset
                            density="compact"
                            class="mb-2"
                          />
                          
                          <v-switch
                            v-model="media_auto_project_video"
                            label="Projetar vídeos automaticamente ao abrir"
                            color="primary"
                            hide-details
                            inset
                            density="compact"
                            class="mb-2"
                          />
                          
                          <v-switch
                            v-model="media_pause_on_minimize"
                            label="Pausar vídeo ao minimizar"
                            color="primary"
                            hide-details
                            inset
                            density="compact"
                          />
                          <v-expand-transition>
                            <div v-show="!media_sync_projection_settings" class="mt-4 pa-4 rounded-xl" style="background: rgba(0,0,0,0.15); border: 1px solid var(--border-color);">
                              <!-- MÚLTIPLAS TELAS (MÍDIA) -->
                              <div class="mb-6">
                                <div class="d-flex align-center mb-4">
                                  <v-icon size="20" color="primary" class="mr-2">
                                    mdi-monitor-multiple
                                  </v-icon>
                                  <span class="text-subtitle-1 font-weight-bold" style="color: var(--sidebar-text);">{{ t('multi_screens') }}</span>
                                </div>
                                
                                <div class="text-body-2 font-weight-medium mb-2" style="color: var(--sidebar-text-secondary);">
                                  Projetar nas seguintes telas:
                                </div>
                                <div v-if="slideMonitorList.length > 0" class="d-flex flex-wrap mt-2" style="gap: 16px;">
                                  <v-card
                                    v-for="monitor in slideMonitorList"
                                    :key="monitor.value"
                                    flat
                                    class="rounded-xl border cursor-pointer"
                                    :class="media_slide_monitor.includes(monitor.value) ? 'elevation-2' : ''"
                                    :style="media_slide_monitor.includes(monitor.value) ? 'background: var(--accent-soft); border: 2px solid var(--accent-blue) !important; transition: all 0.2s;' : 'background: var(--main-bg); border: 2px solid transparent !important; transition: all 0.2s; box-shadow: inset 0 0 0 1px var(--border-color);'"
                                    width="160"
                                    @click="toggleMediaSlideMonitor(monitor.value)"
                                  >
                                    <div class="pa-4 d-flex flex-column align-center">
                                      <v-icon :color="media_slide_monitor.includes(monitor.value) ? 'primary' : 'grey'" size="32" class="mb-2 transition-all">
                                        {{ media_slide_monitor.includes(monitor.value) ? 'mdi-monitor-share' : 'mdi-monitor-off' }}
                                      </v-icon>
                                      <span class="text-body-2 font-weight-bold text-center transition-all" :style="media_slide_monitor.includes(monitor.value) ? 'color: var(--accent-blue)' : 'color: var(--sidebar-text-secondary)'">
                                        {{ monitor.title }}
                                      </span>
                                    </div>
                                  </v-card>
                                </div>
                                <v-alert
                                  v-else
                                  type="info"
                                  variant="tonal"
                                  density="compact"
                                  class="mt-2 text-caption rounded-lg"
                                >
                                  Nenhum monitor estendido (secundário) detectado no sistema.
                                </v-alert>
                              </div>

                              <!-- TELA ÚNICA / PRINCIPAL (MÍDIA) -->
                              <div>
                                <div class="d-flex align-center mb-4">
                                  <v-icon size="20" color="primary" class="mr-2">
                                    mdi-monitor
                                  </v-icon>
                                  <span class="text-subtitle-1 font-weight-bold" style="color: var(--sidebar-text);">{{ t('main_screen') }}</span>
                                </div>
                                
                                <v-switch
                                  v-model="media_slide_fullscreen"
                                  label="Abrir mídias e links em tela cheia na tela principal"
                                  color="primary"
                                  inset
                                  hide-details
                                  density="compact"
                                  class="mb-2 font-weight-medium"
                                />
                                <v-switch
                                  v-model="media_slide_disable_main_if_extended"
                                  label="Desativar tela principal caso haja monitor estendido"
                                  color="primary"
                                  inset
                                  hide-details
                                  density="compact"
                                  class="mb-2 font-weight-medium"
                                />
                                <v-switch
                                  v-model="media_slide_minimize_player"
                                  label="Minimizar o player automaticamente"
                                  color="primary"
                                  inset
                                  hide-details
                                  density="compact"
                                  class="font-weight-medium"
                                />
                              </div>
                            </div>
                          </v-expand-transition>
                        </div>
                      </v-expand-transition>
                    </div>
                    
                    <v-divider class="mb-8 mt-8" style="opacity: 0.1;" />
                      
                    <div class="d-flex justify-center mt-2">
                      <v-btn
                        variant="tonal"
                        color="primary"
                        class="text-none font-weight-bold rounded-lg px-6"
                        @click="resetMediaConfigs"
                      >
                        <v-icon start>
                          mdi-restore
                        </v-icon>
                        {{ t('restore_defaults') }}
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>
              </div>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item :value="4" class="h-100">
            <div class="h-100 overflow-auto px-6 pb-6">
              <div class="settings-container projection-settings mx-auto pb-4" style="max-width: 600px;">
                <CollapsiblePanel :title="t('monitors')" subtitle="Monitores detectados e identificação das telas" icon="mdi-monitor-multiple" class="mb-6">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2 mb-6" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center mb-6">
                      <v-icon color="primary" class="mr-3" size="28">
                        mdi-monitor-multiple
                      </v-icon>
                      <div>
                        <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                          {{ t('monitors') }}
                        </h3>
                      </div>
                    </div>
                    
                    <div class="monitor-showcase">
                      <div
                        v-for="(display, index) in rawDisplays"
                        :key="display.id"
                        class="monitor-device"
                        :class="{ primary: display.isPrimary }"
                      >
                        <div class="monitor-frame">
                          <div class="monitor-toolbar">
                            <span><i /><i /><i /></span>
                            <strong>DISPLAY {{ String(Number(index) + 1).padStart(2, '0') }}</strong>
                            <v-icon :icon="display.isPrimary ? 'mdi-star-four-points' : 'mdi-monitor'" size="15" />
                          </div>
                          <div class="monitor-screen-content">
                            <span class="monitor-scan-line" />
                            <span class="monitor-number">{{ Number(index) + 1 }}</span>
                            <strong>{{ display.bounds.width }} × {{ display.bounds.height }}</strong>
                            <small>{{ display.bounds.width / display.bounds.height > 1.7 ? 'WIDESCREEN' : 'DISPLAY' }}</small>
                          </div>
                        </div>
                        <div class="monitor-neck" /><div class="monitor-base" />
                        <div class="monitor-meta">
                          <span :class="{ online: display.isPrimary }"><i />{{ display.isPrimary ? 'Monitor principal' : 'Monitor estendido' }}</span>
                          <small>X {{ display.bounds.x }} · Y {{ display.bounds.y }}</small>
                        </div>
                      </div>
                    </div>
                    
                    <div class="d-flex justify-center mt-2">
                      <v-btn
                        variant="flat"
                        color="primary"
                        class="text-none font-weight-bold rounded-lg px-6"
                        elevation="2"
                        @click="identifyMonitors"
                      >
                        <v-icon start>
                          mdi-magnify-scan
                        </v-icon>
                        Identificar Monitores
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>

                <CollapsiblePanel :title="t('music_slides')" subtitle="Saídas e janela da projeção" icon="mdi-presentation-play" class="mb-6">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2 mb-6" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center mb-6">
                      <v-icon color="primary" class="mr-3" size="28">
                        mdi-presentation-play
                      </v-icon>
                      <div>
                        <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                          {{ t('music_slides') }}
                        </h3>
                      </div>
                    </div>
                    
                    <!-- MÚLTIPLAS TELAS -->
                    <div class="mb-8 projection-block projection-block--outputs">
                      <div class="d-flex align-center mb-4">
                        <v-icon size="20" color="primary" class="mr-2">
                          mdi-monitor-multiple
                        </v-icon>
                        <span class="text-subtitle-1 font-weight-bold" style="color: var(--sidebar-text);">{{ t('multi_screens') }}</span>
                      </div>
                      
                      <div class="text-body-2 font-weight-medium mb-2" style="color: var(--sidebar-text-secondary);">
                        Projetar nas seguintes telas:
                      </div>
                      <v-select
                        v-model="projection_monitor"
                        :items="slideMonitorList"
                        item-title="detailTitle"
                        item-value="value"
                        label="Monitor principal de projeção"
                        variant="outlined"
                        density="comfortable"
                        clearable
                        hide-details
                        class="mb-4"
                      />
                      <div v-if="slideMonitorList.length > 0" class="d-flex flex-wrap mt-2" style="gap: 16px;">
                        <v-card
                          v-for="monitor in slideMonitorList"
                          :key="monitor.value"
                          flat
                          class="rounded-xl border cursor-pointer"
                          :class="slide_monitor.includes(monitor.value) ? 'elevation-2' : ''"
                          :style="slide_monitor.includes(monitor.value) ? 'background: var(--accent-soft); border: 2px solid var(--accent-blue) !important; transition: all 0.2s;' : 'background: var(--main-bg); border: 2px solid transparent !important; transition: all 0.2s; box-shadow: inset 0 0 0 1px var(--border-color);'"
                          width="160"
                          @click="toggleSlideMonitor(monitor.value)"
                        >
                          <div class="pa-4 d-flex flex-column align-center">
                            <v-icon :color="slide_monitor.includes(monitor.value) ? 'primary' : 'grey'" size="32" class="mb-2 transition-all">
                              {{ slide_monitor.includes(monitor.value) ? 'mdi-monitor-share' : 'mdi-monitor-off' }}
                            </v-icon>
                            <span class="text-body-2 font-weight-bold text-center transition-all" :style="slide_monitor.includes(monitor.value) ? 'color: var(--accent-blue)' : 'color: var(--sidebar-text-secondary)'">
                              {{ monitor.title }}
                            </span>
                            <span class="text-caption text-center mt-1" style="color: var(--sidebar-text-secondary); line-height: 1.2;">
                              {{ monitor.detail }}
                            </span>
                          </div>
                        </v-card>
                      </div>
                      <v-alert
                        v-else
                        type="info"
                        variant="tonal"
                        density="compact"
                        class="mt-2 text-caption rounded-lg"
                      >
                        Nenhum monitor estendido (secundário) detectado no sistema.
                      </v-alert>
                    </div>

                    <v-divider class="mb-8" style="opacity: 0.1;" />

                    <!-- TELA ÚNICA / PRINCIPAL -->
                    <div class="projection-block projection-block--window">
                      <div class="d-flex align-center mb-4">
                        <v-icon size="20" color="primary" class="mr-2">
                          mdi-monitor
                        </v-icon>
                        <span class="text-subtitle-1 font-weight-bold" style="color: var(--sidebar-text);">{{ t('main_screen') }}</span>
                      </div>

                      <v-switch
                        v-model="slide_fullscreen"
                        label="Abrir músicas, mídias e links em tela cheia na tela principal"
                        color="primary"
                        inset
                        hide-details
                        class="mb-2 font-weight-medium"
                      />
                      <v-switch
                        v-model="slide_disable_main_if_extended"
                        label="Desativar tela principal caso haja monitor estendido"
                        color="primary"
                        inset
                        hide-details
                        class="mb-2 font-weight-medium"
                      />
                      <v-switch
                        v-model="slide_minimize_player"
                        label="Minimizar o player automaticamente"
                        color="primary"
                        inset
                        hide-details
                        class="font-weight-medium"
                      />
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>

                <!-- MONITOR DE RETORNO -->
                    <CollapsiblePanel title="Monitor de Retorno" subtitle="Tela auxiliar para letras, cifras, notas e informações da apresentação" icon="mdi-monitor-dashboard" class="mb-6" :hide-first="false">
                    <div class="return-monitor-settings">

                      <v-switch
                        v-model="return_monitor_enabled"
                        label="Ativar modo monitor de retorno"
                        color="primary"
                        inset
                        hide-details
                        class="mb-4 font-weight-medium"
                      />

                      <v-select
                        v-model="return_monitor"
                        :items="monitorList"
                        item-title="detailTitle"
                        item-value="value"
                        label="Monitor de retorno"
                        variant="outlined"
                        density="comfortable"
                        clearable
                        hide-details
                        class="mb-4"
                      />

                      <v-switch
                        v-model="return_monitor_allow_same"
                        label="Permitir usar o mesmo monitor para projeção e retorno"
                        color="primary"
                        inset
                        hide-details
                        class="mb-4 font-weight-medium"
                      />

                      <v-btn
                        variant="flat"
                        color="primary"
                        class="text-none font-weight-bold rounded-lg mb-4"
                        :disabled="!return_monitor"
                        @click="testReturnMonitor"
                      >
                        <v-icon start>
                          mdi-monitor-eye
                        </v-icon>
                        Testar monitor de retorno
                      </v-btn>

                      <div class="d-flex flex-wrap" style="gap: 12px;">
                        <ModernColorPicker
                          v-model="return_monitor_bg_color"
                          label="Cor do fundo"
                          class="flex-grow-1"
                          style="min-width: 180px;"
                        />
                        <ModernColorPicker
                          v-model="return_monitor_text_color"
                          label="Cor do texto"
                          class="flex-grow-1"
                          style="min-width: 180px;"
                        />
                      </div>

                      <div class="mt-4">
                        <div class="text-body-2 font-weight-bold mb-2" style="color: var(--sidebar-text);">
                          Alinhamento do conteudo
                        </div>
                        <v-btn-toggle
                          v-model="return_monitor_text_align"
                          mandatory
                          divided
                          color="primary"
                          class="w-100"
                        >
                          <v-btn value="left" class="flex-grow-1 text-none font-weight-bold">
                            <v-icon start>
                              mdi-format-align-left
                            </v-icon>
                            Esquerda
                          </v-btn>
                          <v-btn value="center" class="flex-grow-1 text-none font-weight-bold">
                            <v-icon start>
                              mdi-format-align-center
                            </v-icon>
                            Centro
                          </v-btn>
                          <v-btn value="right" class="flex-grow-1 text-none font-weight-bold">
                            <v-icon start>
                              mdi-format-align-right
                            </v-icon>
                            Direita
                          </v-btn>
                        </v-btn-toggle>
                      </div>

                      <v-slider
                        v-model="return_monitor_notes_font_size"
                        label="Tamanho das notas"
                        color="primary"
                        min="16"
                        max="96"
                        step="2"
                        thumb-label
                        hide-details
                        class="mt-4"
                      />

                      <v-slider
                        v-model="return_monitor_current_font_size"
                        label="Fonte da letra e cifra atuais"
                        color="primary"
                        min="48"
                        max="150"
                        step="2"
                        thumb-label
                        hide-details
                        class="mt-4"
                      />
                      <v-slider
                        v-model="return_monitor_preview_font_size"
                        label="Fonte da previa (letra e cifra)"
                        color="primary"
                        min="24"
                        max="90"
                        step="2"
                        thumb-label
                        hide-details
                        class="mt-2"
                      />
                      <v-slider
                        v-model="return_monitor_ratio"
                        label="Altura do slide atual"
                        color="primary"
                        min="55"
                        max="90"
                        step="5"
                        thumb-label
                        hide-details
                        class="mt-2"
                      />

                      <v-switch
                        v-model="return_monitor_show_title"
                        label="Exibir título da música"
                        color="primary"
                        inset
                        hide-details
                        class="mt-4 font-weight-medium"
                      />
                      <v-switch
                        v-model="return_monitor_show_next_label"
                        label="Exibir nome do próximo slide"
                        color="primary"
                        inset
                        hide-details
                        class="font-weight-medium"
                      />
                      <v-switch
                        v-model="return_monitor_show_clock"
                        label="Exibir relógio"
                        color="primary"
                        inset
                        hide-details
                        class="font-weight-medium"
                      />
                      <v-switch
                        v-model="return_monitor_show_counter"
                        label="Exibir contador de slides"
                        color="primary"
                        inset
                        hide-details
                        class="font-weight-medium"
                      />
                    </div>
                    </CollapsiblePanel>

                <CollapsiblePanel title="Aparência dos Slides" subtitle="Personalização visual da projeção" icon="mdi-palette-outline" class="mb-6" :hide-first="false">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2 mb-6" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <!-- PERSONALIZAÇÃO -->
                    <div class="projection-block projection-block--visual">
                      <div class="d-flex align-center mb-4">
                        <v-icon size="20" color="primary" class="mr-2">
                          mdi-palette-outline
                        </v-icon>
                        <span class="text-subtitle-1 font-weight-bold" style="color: var(--sidebar-text);">{{ t('font_customization') }}</span>
                      </div>

                      <ConfigMiniPreview
                        class="mb-6"
                        variant="projection"
                        label="Resultado no projetor"
                        :alignment="slide_align"
                        :custom-text="slide_custom_text_format"
                        :font-size="slide_font_size"
                        :font-color="slide_font_color"
                        :font-weight="slide_font_weight"
                        :font-family="slide_font_family"
                        :line-height="slide_line_height"
                        :letter-spacing="slide_letter_spacing"
                        :text-box="slide_text_box"
                        :custom-background="slide_custom_bg"
                        :background-color="slide_bg_color"
                        :background-image="slideBgPreviewUrl"
                        :background-type="slide_bg_type"
                        :background-opacity="slide_bg_opacity"
                        :show-title="slide_show_title"
                      />

                      <div class="mb-6">
                        <div class="text-body-2 font-weight-medium mb-2" style="color: var(--sidebar-text-secondary);">
                          {{ t('font_align') }}
                        </div>
                        <v-btn-toggle
                          v-model="slide_align"
                          color="primary"
                          variant="tonal"
                          mandatory
                          class="rounded-xl d-flex"
                          style="height: 48px; background: var(--card-bg); box-shadow: inset 0 0 0 1px var(--border-color);"
                        >
                          <v-btn value="Cima" class="flex-grow-1 text-none font-weight-bold">
                            <v-icon start size="20">
                              mdi-align-vertical-top
                            </v-icon> Cima
                          </v-btn>
                          <v-btn value="Centro" class="flex-grow-1 text-none font-weight-bold">
                            <v-icon start size="20">
                              mdi-align-vertical-center
                            </v-icon> Centro
                          </v-btn>
                          <v-btn value="Baixo" class="flex-grow-1 text-none font-weight-bold">
                            <v-icon start size="20">
                              mdi-align-vertical-bottom
                            </v-icon> Baixo
                          </v-btn>
                        </v-btn-toggle>
                      </div>
                      
                      <v-switch
                        v-model="slide_show_title"
                        label="Exibir título da música no primeiro slide"
                        color="primary"
                        inset
                        hide-details
                        class="mb-4 font-weight-medium"
                      />

                      <!-- FORMATAÇÃO DE TEXTO PERSONALIZADA -->
                      <div class="mb-4">
                        <v-switch
                          v-model="slide_custom_text_format"
                          label="Formatação de texto personalizada"
                          color="primary"
                          inset
                          hide-details
                          class="font-weight-medium"
                        />
                        <v-expand-transition>
                          <div v-if="slide_custom_text_format" class="mt-4 pa-5 rounded-xl" style="background: var(--main-bg); border: 1px solid var(--border-color);">
                            <!-- Família da fonte -->
                            <div class="mb-6">
                              <div class="d-flex align-center mb-3">
                                <v-icon size="18" color="primary" class="mr-2">
                                  mdi-format-font
                                </v-icon>
                                <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">Fonte</span>
                              </div>
                              <div class="d-flex align-center" style="gap: 10px;">
                                <v-autocomplete
                                  v-model="slide_font_family"
                                  :items="slideFontFamilies"
                                  :loading="system_fonts_loading"
                                  variant="outlined"
                                  density="comfortable"
                                  no-data-text="Nenhuma fonte encontrada"
                                  auto-select-first
                                  hide-details
                                  :menu-props="{ maxHeight: 420 }"
                                  class="flex-grow-1"
                                >
                                  <template #selection="{ item }">
                                    <span :style="{ fontFamily: `${item.value}, sans-serif` }">{{ item.title }}</span>
                                  </template>
                                  <template #item="{ props, item }">
                                    <v-list-item v-bind="props" :style="{ fontFamily: `${item.value}, sans-serif` }" />
                                  </template>
                                </v-autocomplete>
                                <v-btn
                                  icon
                                  variant="tonal"
                                  color="primary"
                                  :loading="system_fonts_loading"
                                  title="Atualizar fontes instaladas"
                                  @click="loadSystemFonts"
                                >
                                  <v-icon>mdi-refresh</v-icon>
                                </v-btn>
                              </div>
                              <div class="text-caption mt-2" style="color: var(--sidebar-text-secondary);">
                                {{ slideFontFamilies.length }} fontes instaladas encontradas
                              </div>
                            </div>

                            <!-- Tamanho do texto -->
                            <div class="mb-6">
                              <div class="d-flex align-center justify-space-between mb-3">
                                <div class="d-flex align-center">
                                  <v-icon size="18" color="primary" class="mr-2">
                                    mdi-format-size
                                  </v-icon>
                                  <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">{{ t('font_size') }}</span>
                                </div>
                                <v-chip
                                  size="small"
                                  variant="tonal"
                                  color="primary"
                                  class="font-weight-bold"
                                >
                                  {{ slide_font_size }}%
                                </v-chip>
                              </div>
                              <div class="d-flex align-center" style="gap: 12px;">
                                <v-btn
                                  icon
                                  size="small"
                                  variant="tonal"
                                  color="primary"
                                  @click="slide_font_size = Math.max(50, slide_font_size - 5)"
                                >
                                  <v-icon size="18">
                                    mdi-minus
                                  </v-icon>
                                </v-btn>
                                <v-slider
                                  v-model="slide_font_size"
                                  :min="50"
                                  :max="200"
                                  :step="5"
                                  color="primary"
                                  track-color="grey-lighten-3"
                                  hide-details
                                  class="flex-grow-1"
                                />
                                <v-btn
                                  icon
                                  size="small"
                                  variant="tonal"
                                  color="primary"
                                  @click="slide_font_size = Math.min(200, slide_font_size + 5)"
                                >
                                  <v-icon size="18">
                                    mdi-plus
                                  </v-icon>
                                </v-btn>
                              </div>
                            </div>

                            <!-- Espaçamento entre linhas -->
                            <div class="mb-6">
                              <div class="d-flex align-center justify-space-between mb-3">
                                <div class="d-flex align-center">
                                  <v-icon size="18" color="primary" class="mr-2">
                                    mdi-format-line-spacing
                                  </v-icon>
                                  <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">Espaçamento entre linhas</span>
                                </div>
                                <v-chip size="small" variant="tonal" color="primary" class="font-weight-bold">
                                  {{ slide_line_height }}%
                                </v-chip>
                              </div>
                              <v-slider
                                v-model="slide_line_height"
                                :min="80"
                                :max="250"
                                :step="5"
                                color="primary"
                                track-color="grey-lighten-3"
                                hide-details
                              />
                            </div>

                            <!-- Espaçamento entre letras -->
                            <div class="mb-6">
                              <div class="d-flex align-center justify-space-between mb-3">
                                <div class="d-flex align-center">
                                  <v-icon size="18" color="primary" class="mr-2">
                                    mdi-format-letter-spacing
                                  </v-icon>
                                  <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">Espaçamento entre letras</span>
                                </div>
                                <v-chip size="small" variant="tonal" color="primary" class="font-weight-bold">
                                  {{ slide_letter_spacing }}%
                                </v-chip>
                              </div>
                              <v-slider
                                v-model="slide_letter_spacing"
                                :min="-10"
                                :max="50"
                                :step="1"
                                color="primary"
                                track-color="grey-lighten-3"
                                hide-details
                              />
                            </div>

                            <!-- Cor do texto -->
                            <div class="mb-6">
                              <div class="d-flex align-center mb-3">
                                <v-icon size="18" color="primary" class="mr-2">
                                  mdi-palette
                                </v-icon>
                                <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">{{ t('font_color') }}</span>
                              </div>
                              <div class="d-flex flex-wrap align-center" style="gap: 10px;">
                                <div
                                  v-for="color in ['#FFFFFF', '#f6c32a', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD']"
                                  :key="color"
                                  class="rounded-circle cursor-pointer elevation-1"
                                  :class="slide_font_color === color ? 'elevation-4' : ''"
                                  :style="{
                                    width: '36px', height: '36px',
                                    background: color,
                                    border: slide_font_color === color ? '3px solid var(--accent-blue)' : '2px solid rgba(0,0,0,0.1)',
                                    transition: 'all 0.2s',
                                    transform: slide_font_color === color ? 'scale(1.15)' : 'scale(1)',
                                  }"
                                  @click="slide_font_color = color"
                                />
                                <ModernColorPicker v-model="slide_font_color">
                                  <template #activator="{ props }">
                                    <div
                                      v-bind="props"
                                      class="rounded-circle cursor-pointer elevation-1 d-flex align-center justify-center"
                                      style="width: 36px; height: 36px; border: 2px dashed var(--border-color); background: var(--card-bg);"
                                    >
                                      <v-icon size="16" color="grey">
                                        mdi-eyedropper
                                      </v-icon>
                                    </div>
                                  </template>
                                </ModernColorPicker>
                              </div>
                            </div>

                            <!-- Peso da fonte -->
                            <div class="mb-6">
                              <div class="d-flex align-center mb-3">
                                <v-icon size="18" color="primary" class="mr-2">
                                  mdi-format-bold
                                </v-icon>
                                <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">{{ t('font_weight') }}</span>
                              </div>
                              <v-btn-toggle
                                v-model="slide_font_weight"
                                color="primary"
                                variant="tonal"
                                mandatory
                                class="rounded-xl d-flex"
                                style="height: 42px; background: var(--card-bg); box-shadow: inset 0 0 0 1px var(--border-color);"
                              >
                                <v-btn value="400" class="flex-grow-1 text-none" style="font-weight: 400;">
                                  {{ t('weight_normal') }}
                                </v-btn>
                                <v-btn value="600" class="flex-grow-1 text-none" style="font-weight: 600;">
                                  {{ t('weight_semi') }}
                                </v-btn>
                                <v-btn value="700" class="flex-grow-1 text-none" style="font-weight: 700;">
                                  {{ t('weight_bold') }}
                                </v-btn>
                                <v-btn value="900" class="flex-grow-1 text-none" style="font-weight: 900;">
                                  {{ t('weight_extra') }}
                                </v-btn>
                              </v-btn-toggle>
                            </div>

                            <v-switch
                              v-model="slide_text_box"
                              label="Exibir quadro ao fundo da letra"
                              color="primary"
                              inset
                              hide-details
                              class="font-weight-medium"
                            />
                          </div>
                        </v-expand-transition>
                      </div>

                      <!-- FUNDO PERSONALIZADO -->
                      <div>
                        <v-switch
                          v-model="slide_custom_bg"
                          label="Fundo personalizado"
                          color="primary"
                          inset
                          hide-details
                          class="font-weight-medium"
                        />
                        <v-expand-transition>
                          <div v-if="slide_custom_bg" class="mt-4 pa-5 rounded-xl" style="background: var(--main-bg); border: 1px solid var(--border-color);">
                            <!-- Cor de fundo -->
                            <div class="mb-6">
                              <div class="d-flex align-center mb-3">
                                <v-icon size="18" color="primary" class="mr-2">
                                  mdi-format-color-fill
                                </v-icon>
                                <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">{{ t('bg_color') }}</span>
                              </div>
                              <div class="d-flex flex-wrap align-center" style="gap: 10px;">
                                <div
                                  v-for="color in ['#000000', '#192A56', '#FFFFFF', '#2F3640', '#FEF9E7', '#2C3A47', '#6D214F', '#2C2C54']"
                                  :key="color"
                                  class="rounded-circle cursor-pointer elevation-1"
                                  :class="slide_bg_color === color ? 'elevation-4' : ''"
                                  :style="{
                                    width: '36px', height: '36px',
                                    background: color,
                                    border: slide_bg_color === color ? '3px solid var(--accent-blue)' : '2px solid rgba(255,255,255,0.1)',
                                    transition: 'all 0.2s',
                                    transform: slide_bg_color === color ? 'scale(1.15)' : 'scale(1)',
                                  }"
                                  @click="slide_bg_color = color"
                                />
                                <ModernColorPicker v-model="slide_bg_color">
                                  <template #activator="{ props }">
                                    <div
                                      v-bind="props"
                                      class="rounded-circle cursor-pointer elevation-1 d-flex align-center justify-center"
                                      style="width: 36px; height: 36px; border: 2px dashed var(--border-color); background: var(--card-bg);"
                                    >
                                      <v-icon size="16" color="grey">
                                        mdi-eyedropper
                                      </v-icon>
                                    </div>
                                  </template>
                                </ModernColorPicker>
                              </div>
                            </div>

                            <!-- Imagem de fundo -->
                            <div class="mb-6">
                              <div class="d-flex align-center mb-3">
                                <v-icon size="18" color="primary" class="mr-2">
                                  mdi-image-outline
                                </v-icon>
                                <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">{{ t('bg_image') }}</span>
                              </div>
                              
                              <div v-if="slide_bg_image" class="position-relative rounded-xl overflow-hidden mb-3" style="height: 140px; border: 1px solid var(--border-color);">
                                <video
                                  v-if="slide_bg_type === 'video'"
                                  :src="slideBgPreviewUrl"
                                  class="w-100 h-100"
                                  style="object-fit: cover;"
                                  autoplay
                                  muted
                                  loop
                                  playsinline
                                />
                                <img
                                  v-else
                                  :src="slideBgPreviewUrl"
                                  class="w-100 h-100"
                                  style="object-fit: cover;"
                                />
                                <div class="position-absolute w-100 h-100 d-flex align-center justify-center" style="top: 0; left: 0; background: rgba(0,0,0,0.3);">
                                  <v-btn
                                    icon
                                    size="small"
                                    variant="flat"
                                    color="error"
                                    class="mr-2"
                                    @click="slide_bg_image = null"
                                  >
                                    <v-icon>mdi-delete</v-icon>
                                    <v-tooltip activator="parent" location="top">
                                      {{ t('remove_image') }}
                                    </v-tooltip>
                                  </v-btn>
                                  <v-btn
                                    icon
                                    size="small"
                                    variant="flat"
                                    color="white"
                                    @click="($refs.bgImageInput as HTMLInputElement)?.click()"
                                  >
                                    <v-icon color="black">
                                      mdi-pencil
                                    </v-icon>
                                    <v-tooltip activator="parent" location="top">
                                      {{ t('change_image') }}
                                    </v-tooltip>
                                  </v-btn>
                                </div>
                              </div>

                              <div
                                v-else
                                class="rounded-xl d-flex flex-column align-center justify-center cursor-pointer"
                                style="height: 100px; border: 2px dashed var(--border-color); background: var(--card-bg); transition: all 0.2s;"
                                @click="($refs.bgImageInput as HTMLInputElement)?.click()"
                              >
                                <v-icon size="32" color="grey-lighten-1" class="mb-2">
                                  mdi-cloud-upload-outline
                                </v-icon>
                                <span class="text-caption font-weight-medium" style="color: var(--sidebar-text-secondary);">{{ t('select_image') }}</span>
                              </div>

                              <input
                                ref="bgImageInput"
                                type="file"
                                accept="image/*,video/mp4"
                                style="display: none;"
                                @change="onBgImageSelect"
                              />
                            </div>

                            <!-- Opacidade do fundo -->
                            <div>
                              <div class="d-flex align-center justify-space-between mb-3">
                                <div class="d-flex align-center">
                                  <v-icon size="18" color="primary" class="mr-2">
                                    mdi-opacity
                                  </v-icon>
                                  <span class="text-body-2 font-weight-bold" style="color: var(--sidebar-text);">{{ t('bg_opacity') }}</span>
                                </div>
                                <v-chip
                                  size="small"
                                  variant="tonal"
                                  color="primary"
                                  class="font-weight-bold"
                                >
                                  {{ slide_bg_opacity }}%
                                </v-chip>
                              </div>
                              <v-slider
                                v-model="slide_bg_opacity"
                                :min="0"
                                :max="100"
                                :step="5"
                                color="primary"
                                track-color="grey-lighten-3"
                                hide-details
                              />
                            </div>
                          </div>
                        </v-expand-transition>
                      </div>
                    </div>
                    
                    <v-divider class="mb-8 mt-8" style="opacity: 0.1;" />
                      
                    <div class="d-flex justify-center mt-2">
                      <v-btn
                        variant="tonal"
                        color="primary"
                        class="text-none font-weight-bold rounded-lg px-6"
                        @click="resetSlideConfigs"
                      >
                        <v-icon start>
                          mdi-restore
                        </v-icon>
                        {{ t('restore_defaults') }}
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>
              </div>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item :value="5" class="h-100">
            <div class="h-100 overflow-auto px-6 pb-6">
              <div class="settings-container mx-auto d-flex flex-column" style="max-width: 720px; gap: 24px;">
                <CollapsiblePanel title="Controle remoto por rede" subtitle="Servidor local, endereço e inicialização automática" icon="mdi-remote" class="mt-6" :hide-first="false">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2 mt-6" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center justify-space-between mb-6" style="gap: 16px; flex-wrap: wrap;">
                      <div class="d-flex align-center">
                        <v-icon color="primary" class="mr-3" size="28">
                          mdi-remote
                        </v-icon>
                        <div>
                          <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                            Controle remoto por rede
                          </h3>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            Acesse o controle por celular ou outro dispositivo na mesma rede.
                          </div>
                        </div>
                      </div>
                      <v-chip
                        :color="remote_control_running ? 'success' : 'error'"
                        variant="tonal"
                        class="font-weight-bold"
                      >
                        {{ remote_control_running ? 'Servidor ativo' : 'Servidor parado' }}
                      </v-chip>
                    </div>

                    <v-alert
                      v-if="remote_control_addresses.length > 0"
                      type="info"
                      variant="tonal"
                      density="comfortable"
                      class="rounded-lg mb-6"
                    >
                      <div class="font-weight-bold mb-1">
                        Endereço atual
                      </div>
                      <div
                        v-for="address in remote_control_addresses"
                        :key="address"
                        class="text-body-2"
                      >
                        {{ address }}
                      </div>
                    </v-alert>
                    <v-alert
                      v-else
                      type="warning"
                      variant="tonal"
                      density="comfortable"
                      class="rounded-lg mb-6"
                    >
                      Nenhum endereço disponível. Inicie o servidor e verifique se o computador está conectado à rede.
                    </v-alert>

                    <div
                      v-if="remote_control_running && remote_control_qr_code"
                      class="d-flex align-center mb-6 pa-4 rounded-xl"
                      style="gap: 20px; flex-wrap: wrap; background: var(--main-bg); border: 1px solid var(--border-color);"
                    >
                      <img
                        :src="remote_control_qr_code"
                        alt="QR Code do controle remoto"
                        width="148"
                        height="148"
                        class="rounded-lg"
                        style="background: white;"
                      />
                      <div style="flex: 1; min-width: 220px;">
                        <div class="font-weight-bold mb-1" style="color: var(--sidebar-text);">
                          Conectar pelo celular
                        </div>
                        <div class="text-body-2 mb-3" style="color: var(--sidebar-text-secondary);">
                          Abra a câmera do celular e leia o QR Code. O dispositivo precisa estar na mesma rede do computador.
                        </div>
                        <v-chip size="small" color="success" variant="tonal" prepend-icon="mdi-wifi">
                          Atualização e reconexão automáticas
                        </v-chip>
                      </div>
                    </div>

                    <div class="d-flex flex-column" style="gap: 18px;">
                      <div class="d-flex align-center justify-space-between" style="gap: 16px; flex-wrap: wrap;">
                        <div class="d-flex align-center">
                          <v-icon color="primary" class="mr-3" size="24">
                            mdi-power
                          </v-icon>
                          <div>
                            <div class="font-weight-bold" style="color: var(--sidebar-text);">
                              Iniciar servidor ao abrir o IASDPresenter
                            </div>
                            <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                              Mantém o controle disponível automaticamente.
                            </div>
                          </div>
                        </div>
                        <v-switch
                          v-model="remote_control_config.enabled"
                          color="primary"
                          inset
                          hide-details
                        />
                      </div>

                      <v-divider style="opacity: 0.1;" />

                      <div class="d-flex" style="gap: 16px; flex-wrap: wrap;">
                        <v-select
                          v-model="remote_control_config.host"
                          :items="remote_control_network_options"
                          item-title="title"
                          item-value="value"
                          label="IP do servidor"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                          style="min-width: 260px; flex: 1;"
                        />
                        <v-text-field
                          v-model.number="remote_control_config.port"
                          type="number"
                          label="Porta"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                          min="1024"
                          max="65535"
                          style="max-width: 160px;"
                        />
                      </div>

                      <div class="d-flex align-center justify-space-between" style="gap: 12px; flex-wrap: wrap;">
                        <div class="text-caption" style="color: var(--sidebar-text-secondary); max-width: 460px;">
                          Use “Todos os IPs da rede” para aceitar conexões de qualquer adaptador conectado. Se trocar IP ou porta, salve para reiniciar o servidor.
                        </div>
                        <div class="d-flex" style="gap: 8px;">
                          <v-btn
                            color="primary"
                            variant="tonal"
                            class="text-none rounded-lg font-weight-bold"
                            :loading="remote_control_loading"
                            @click="saveRemoteControlConfig"
                          >
                            Salvar
                          </v-btn>
                          <v-btn
                            v-if="remote_control_running"
                            color="error"
                            variant="tonal"
                            class="text-none rounded-lg font-weight-bold"
                            :loading="remote_control_loading"
                            @click="stopRemoteControlServer"
                          >
                            Encerrar
                          </v-btn>
                          <v-btn
                            v-else
                            color="success"
                            variant="tonal"
                            class="text-none rounded-lg font-weight-bold"
                            :loading="remote_control_loading"
                            @click="startRemoteControlServer"
                          >
                            Iniciar
                          </v-btn>
                        </div>
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>

                <CollapsiblePanel title="Saída web para OBS e vMix" subtitle="Vídeo 1080p pela rede local" icon="mdi-broadcast" :hide-first="false">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center mb-5">
                      <v-icon color="primary" class="mr-3" size="28">
                        mdi-broadcast
                      </v-icon>
                      <div>
                        <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                          Saída web nativa
                        </h3>
                        <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                          Espelha a projeção em 1920×1080 e 30 quadros por segundo, sem placa de captura ou plugin.
                        </div>
                      </div>
                    </div>

                    <div class="d-flex align-center justify-space-between mb-5" style="gap: 16px; flex-wrap: wrap;">
                      <div>
                        <div class="font-weight-bold" style="color: var(--sidebar-text);">
                          Ativar saída web
                        </div>
                        <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                          Permite que dispositivos na rede acessem o vídeo da projeção.
                        </div>
                      </div>
                      <v-switch
                        :model-value="remote_control_config.webOutputEnabled"
                        color="primary"
                        inset
                        hide-details
                        :loading="remote_control_loading"
                        @update:model-value="updateWebOutputEnabled"
                      />
                    </div>

                    <v-select
                      v-if="remote_control_config.webOutputEnabled"
                      class="mb-5"
                      label="Conteúdo transmitido"
                      :items="web_output_source_options"
                      item-title="title"
                      item-value="value"
                      :model-value="remote_control_config.webOutputSource"
                      variant="outlined"
                      density="comfortable"
                      persistent-hint
                      hint="Projeção mostra a saída principal. Retorno mostra letras, próximo slide e informações do monitor de retorno."
                      :loading="remote_control_loading"
                      @update:model-value="updateWebOutputSource"
                    />

                    <v-alert v-if="!remote_control_config.webOutputEnabled" type="info" variant="tonal" density="comfortable" class="rounded-lg">
                      A saída web está desativada. O controle remoto pode continuar funcionando normalmente.
                    </v-alert>
                    <v-alert v-else-if="!remote_control_running" type="warning" variant="tonal" density="comfortable" class="rounded-lg">
                      Inicie o servidor de rede acima para disponibilizar a saída web.
                    </v-alert>
                    <div v-else-if="web_output_addresses.length" class="d-flex flex-column" style="gap: 12px;">
                      <div
                        v-for="address in web_output_addresses"
                        :key="address"
                        class="d-flex align-center pa-3 rounded-lg"
                        style="gap: 10px; background: var(--main-bg); border: 1px solid var(--border-color);"
                      >
                        <code style="min-width: 0; flex: 1; overflow-wrap: anywhere; color: var(--sidebar-text);">{{ address }}</code>
                        <v-btn
                          icon="mdi-content-copy"
                          size="small"
                          variant="tonal"
                          color="primary"
                          title="Copiar URL"
                          @click="copyWebOutputAddress(address)"
                        />
                      </div>
                      <div class="text-body-2" style="color: var(--sidebar-text-secondary);">
                        Cole uma das URLs no <strong>Browser Source</strong> do OBS ou no <strong>Web Input</strong> do vMix. Defina a fonte como 1920×1080.
                      </div>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>

                <CollapsiblePanel title="Segurança de acesso" subtitle="Senha e proteção do controle remoto" icon="mdi-shield-key">
                <v-card class="settings-card legacy-panel-content rounded-xl pa-2" flat style="background: var(--card-bg); box-shadow: var(--shadow);">
                  <v-card-text class="pa-6">
                    <div class="d-flex align-center mb-6">
                      <v-icon color="primary" class="mr-3" size="28">
                        mdi-shield-key
                      </v-icon>
                      <div>
                        <h3 class="font-weight-bold" style="color: var(--sidebar-text); font-size: 1.1rem; line-height: 1.2;">
                          Segurança de acesso
                        </h3>
                        <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                          Proteja o controle remoto com senha na rede local.
                        </div>
                      </div>
                    </div>

                    <div class="d-flex flex-column" style="gap: 18px;">
                      <div class="d-flex align-center justify-space-between" style="gap: 16px; flex-wrap: wrap;">
                        <div>
                          <div class="font-weight-bold" style="color: var(--sidebar-text);">
                            Exigir senha para acessar
                          </div>
                          <div class="text-caption" style="color: var(--sidebar-text-secondary);">
                            Quem abrir o link precisará informar a senha antes de buscar ou enviar comandos.
                          </div>
                        </div>
                        <v-switch
                          v-model="remote_control_config.requirePassword"
                          color="primary"
                          inset
                          hide-details
                        />
                      </div>

                      <v-text-field
                        v-model="remote_control_config.password"
                        :type="show_remote_control_password ? 'text' : 'password'"
                        label="Senha do controle remoto"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                        :append-inner-icon="show_remote_control_password ? 'mdi-eye-off' : 'mdi-eye'"
                        @click:append-inner="show_remote_control_password = !show_remote_control_password"
                      />

                      <v-alert
                        type="warning"
                        variant="tonal"
                        density="compact"
                        class="rounded-lg"
                      >
                        Evite deixar sem senha em redes públicas. Se o Windows Firewall perguntar, libere apenas em rede privada.
                      </v-alert>
                    </div>
                  </v-card-text>
                </v-card>
                </CollapsiblePanel>
              </div>
            </div>
          </v-tabs-window-item>

          <v-tabs-window-item :value="6" class="h-100">
            <div class="h-100 overflow-auto px-6 pb-6">
              <div class="settings-container automation-settings mx-auto d-flex flex-column">
                <CollapsiblePanel title="Gatilhos de automação" subtitle="Ativação e comportamento geral" icon="mdi-lightning-bolt" class="mt-6" :hide-first="false">
                  <div class="automation-overview" :class="{ active: automation_config.enabled }">
                    <div class="automation-overview-main">
                      <div class="automation-hero-icon">
                        <v-icon size="30">mdi-lightning-bolt</v-icon>
                      </div>
                      <div class="automation-overview-copy">
                        <div class="automation-eyebrow">
                          <span class="automation-status-dot" />
                          {{ automation_config.enabled ? 'Sistema ativo' : 'Sistema desativado' }}
                        </div>
                        <h3>Automação inteligente de áudio</h3>
                        <p>Execute cenas da Soundcraft junto aos momentos da liturgia, com controle e segurança.</p>
                      </div>
                      <div class="automation-master-control">
                        <span>{{ automation_config.enabled ? 'Ativado' : 'Desativado' }}</span>
                        <v-switch
                          v-model="automation_config.enabled"
                          color="primary"
                          inset
                          hide-details
                          aria-label="Ativar gatilhos de automação"
                        />
                      </div>
                    </div>

                    <div class="automation-options-grid">
                      <label class="automation-option">
                        <span class="automation-option-icon"><v-icon size="21">mdi-flask-outline</v-icon></span>
                        <span class="automation-option-copy">
                          <strong>Modo simulação</strong>
                          <small>Valide os comandos sem alterar o áudio da mesa.</small>
                        </span>
                        <v-switch
                          v-model="automation_config.simulationMode"
                          color="primary"
                          inset
                          hide-details
                          density="compact"
                          aria-label="Ativar modo simulação"
                        />
                      </label>
                      <label class="automation-option">
                        <span class="automation-option-icon"><v-icon size="21">mdi-eye-outline</v-icon></span>
                        <span class="automation-option-copy">
                          <strong>Status na liturgia</strong>
                          <small>Mostre o andamento dos gatilhos durante a apresentação.</small>
                        </span>
                        <v-switch
                          v-model="automation_config.showStatus"
                          color="primary"
                          inset
                          hide-details
                          density="compact"
                          aria-label="Mostrar status durante a liturgia"
                        />
                      </label>
                    </div>
                  </div>
                </CollapsiblePanel>

                <CollapsiblePanel title="Dispositivo Soundcraft Ui" subtitle="Conexão com a mesa de áudio" icon="mdi-mixer">
                  <div class="automation-device-card">
                    <div class="device-card-intro">
                      <div class="device-visual">
                        <v-icon size="26">mdi-mixer</v-icon>
                        <span class="device-signal"><i /><i /><i /></span>
                      </div>
                      <div>
                        <span class="automation-eyebrow">Dispositivo principal</span>
                        <h3>Soundcraft Ui</h3>
                        <p>Informe o endereço da mesa conectada à mesma rede deste computador.</p>
                      </div>
                    </div>

                    <div class="device-fields">
                      <v-text-field
                        v-model="automation_device.name"
                        label="Nome do dispositivo"
                        prepend-inner-icon="mdi-tag-outline"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      />
                      <v-text-field
                        v-model="automation_device.ip"
                        label="Endereço IP"
                        placeholder="192.168.0.80"
                        prepend-inner-icon="mdi-ip-network-outline"
                        variant="outlined"
                        density="comfortable"
                        hide-details
                      />
                    </div>

                    <div class="device-card-footer">
                      <div class="device-network-hint">
                        <v-icon size="17">mdi-lan</v-icon>
                        Rede local segura
                      </div>
                      <div class="device-actions">
                      <v-btn
                        color="primary"
                        variant="tonal"
                        class="text-none font-weight-bold"
                        prepend-icon="mdi-lan-connect"
                        :loading="automation_loading"
                        @click="testAutomationDevice"
                      >
                        Testar conexão
                      </v-btn>
                      <v-btn
                        color="primary"
                        variant="flat"
                        class="text-none font-weight-bold"
                        prepend-icon="mdi-content-save-outline"
                        :loading="automation_loading"
                        @click="saveAutomationConfig"
                      >
                        Salvar automação
                      </v-btn>
                      </div>
                    </div>
                  </div>
                </CollapsiblePanel>

                <CollapsiblePanel title="Gatilhos" subtitle="Cenas reutilizáveis associadas aos itens da liturgia" icon="mdi-playlist-check" :hide-first="false">
                  <div class="triggers-workspace">
                    <div class="triggers-toolbar">
                      <div>
                        <div class="triggers-title-line">
                          <h3>Cenas de automação</h3>
                          <span class="trigger-count">{{ automation_config.triggers.length }}</span>
                        </div>
                        <p>Configure o comando que será disponibilizado nos itens da liturgia.</p>
                      </div>
                      <v-btn
                        color="primary"
                        variant="flat"
                        class="text-none font-weight-bold"
                        prepend-icon="mdi-plus"
                        @click="addAutomationTrigger"
                      >
                        Novo gatilho
                      </v-btn>
                    </div>

                    <div v-if="automation_config.triggers.length === 0" class="automation-empty">
                      <div class="automation-empty-icon"><v-icon size="34">mdi-lightning-bolt-outline</v-icon></div>
                      <h3>Crie seu primeiro gatilho</h3>
                      <p>Adicione uma cena para controlar canais, volumes e transições diretamente pela liturgia.</p>
                      <v-btn
                        color="primary"
                        variant="tonal"
                        class="text-none font-weight-bold"
                        prepend-icon="mdi-plus"
                        @click="addAutomationTrigger"
                      >
                        Criar gatilho
                      </v-btn>
                    </div>

                    <div v-else class="trigger-list">
                      <article
                        v-for="(trigger, index) in automation_config.triggers"
                        :key="trigger.id"
                        class="trigger-card"
                        :class="{ disabled: !trigger.enabled }"
                      >
                      <div class="trigger-card-header">
                        <div class="trigger-identity">
                          <span class="trigger-index">{{ String(index + 1).padStart(2, '0') }}</span>
                          <div>
                            <strong>Gatilho de áudio</strong>
                            <small>{{ trigger.enabled ? 'Pronto para uso' : 'Pausado' }}</small>
                          </div>
                        </div>
                        <v-text-field
                          v-model="trigger.name"
                          label="Nome do gatilho"
                          prepend-inner-icon="mdi-lightning-bolt-outline"
                          variant="outlined"
                          density="comfortable"
                          hide-details
                          class="trigger-name-field"
                        />
                        <div class="trigger-header-actions">
                          <label class="trigger-enabled-control">
                            <span>{{ trigger.enabled ? 'Ativo' : 'Inativo' }}</span>
                            <v-switch v-model="trigger.enabled" color="primary" inset hide-details density="compact" />
                          </label>
                          <v-tooltip text="Excluir gatilho" location="top">
                            <template #activator="{ props }">
                              <v-btn
                                v-bind="props"
                                icon="mdi-delete-outline"
                                size="small"
                                variant="tonal"
                                color="error"
                                aria-label="Excluir gatilho"
                                @click="removeAutomationTrigger(index)"
                              />
                            </template>
                          </v-tooltip>
                        </div>
                      </div>

                      <div
                        v-for="(action, actionIndex) in trigger.actions"
                        :key="action.id"
                        class="trigger-action"
                      >
                        <div class="trigger-action-title">
                          <span><v-icon size="17">mdi-tune-vertical</v-icon></span>
                          <div><strong>Ação {{ Number(actionIndex) + 1 }}</strong><small>Comando executado pela mesa</small></div>
                        </div>
                        <div class="trigger-action-grid">
                          <v-select v-model="action.operation" :items="automationOperationOptions" label="Ação" prepend-inner-icon="mdi-playlist-play" variant="outlined" density="comfortable" hide-details />
                          <v-select v-model="action.target" :items="automationTargetOptions" label="Alvo" prepend-inner-icon="mdi-target" variant="outlined" density="comfortable" hide-details />
                          <v-text-field v-if="action.target === 'input'" v-model.number="action.channel" type="number" label="Canal" min="1" max="16" variant="outlined" density="comfortable" hide-details />
                          <v-text-field v-if="['setFaderLevelDB', 'fadeToDB'].includes(action.operation)" v-model.number="action.valueDB" type="number" label="Volume dB" min="-90" max="10" variant="outlined" density="comfortable" hide-details />
                          <v-text-field v-if="action.operation === 'fadeToDB'" v-model.number="action.fadeMs" type="number" label="Fade (ms)" min="0" variant="outlined" density="comfortable" hide-details />
                        </div>
                        <label v-if="['setFaderLevelDB', 'fadeToDB'].includes(action.operation)" class="restore-control">
                          <span class="restore-icon"><v-icon size="19">mdi-restore</v-icon></span>
                          <span class="restore-copy"><strong>Volume ao encerrar</strong><small>Defina o nível aplicado quando a mídia terminar.</small></span>
                          <v-switch v-model="action.restoreOnMediaEnd" color="primary" inset hide-details density="compact" />
                        </label>
                        <div v-if="action.restoreOnMediaEnd && ['setFaderLevelDB', 'fadeToDB'].includes(action.operation)" class="trigger-end-grid">
                          <v-text-field v-model.number="action.endValueDB" type="number" label="Volume final (dB)" min="-90" max="10" prepend-inner-icon="mdi-volume-medium" variant="outlined" density="comfortable" hide-details />
                          <v-text-field v-model.number="action.endFadeMs" type="number" label="Fade final (ms)" min="0" prepend-inner-icon="mdi-timer-sand" variant="outlined" density="comfortable" hide-details />
                        </div>
                      </div>

                      <div class="trigger-card-footer">
                        <span><v-icon size="16">mdi-shield-check-outline</v-icon> Teste antes de usar na apresentação</span>
                        <v-btn
                          color="primary"
                          variant="tonal"
                          class="text-none font-weight-bold"
                          prepend-icon="mdi-play-circle-outline"
                          :loading="automation_loading"
                          @click="testAutomationTrigger(trigger)"
                        >
                          Testar gatilho
                        </v-btn>
                      </div>
                      </article>
                    </div>
                  </div>
                </CollapsiblePanel>
              </div>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </div>
    </div>
  </v-slide-y-reverse-transition>
</template>

<script lang="ts">
import manifest from "../manifest.json";
import MenuToggleButton from "@/components/MenuToggleButton.vue";
import ModernColorPicker from "@/components/inputs/ModernColorPicker.vue";
import ConfigMiniPreview from "./ConfigMiniPreview.vue";
import CollapsiblePanel from "./CollapsiblePanel.vue";
import $media from "@/helpers/Media";

export default {
  name: manifest.id,
  components: {
    MenuToggleButton,
    ModernColorPicker,
    ConfigMiniPreview,
    CollapsiblePanel,
  },
  data: () => ({
    tab: 1,
    configTabs: [
      { value: 1, label: "Aparência", icon: "mdi-palette-outline" },
      { value: 2, label: "Geral", icon: "mdi-tune-variant" },
      { value: 3, label: "Mídia e player", icon: "mdi-play-box-multiple-outline" },
      { value: 4, label: "Projeção e telas", icon: "mdi-monitor-multiple" },
      { value: 5, label: "Controle remoto", icon: "mdi-remote" },
      { value: 6, label: "Automação", icon: "mdi-lightning-bolt-outline" },
    ],
    language: "pt",
    accent_color: "#0097d7",
    home_layout: "classic",
    sidebar_auto_collapse: false,
    show_home_history: true,
    primary_hymnal: "hymnal",
    hardware_accel: true,
    light_mode: false,
    light_optimize_presentations: true,
    light_limit_projection_windows: true,
    light_disable_hardware_acceleration: false,
    applied_disable_hardware_acceleration: false,
    performance_restart_loading: false,
    performance_restart_error: "",
    fullscreen_mode: false,
    
    fade_effect: false,
    bg_color: "#000000",
    bg_image: null,
    bg_align: "Centro",
    
    player_monitor: "Monitor 1",
    exec_audio_player: false,
    exec_video_player: false,
    player_fullscreen: true,
    online_monitor: "Monitor 1",
    online_fullscreen: true,
    youtube_mode: "Vídeo",
    
    media_use_internal_player: true,
    media_liturgy_transition_duration: 0.6,
    media_sync_projection_settings: true,
    media_auto_project_video: true,
    media_pause_on_minimize: false,
    media_slide_monitor: [],
    media_slide_fullscreen: true,
    media_slide_disable_main_if_extended: true,
    media_slide_minimize_player: false,
    
    projection_monitor: null,
    slide_monitor: [],
    slide_align: "Centro",
    slide_fullscreen: true,
    slide_disable_main_if_extended: true,
    slide_minimize_player: false,
    slide_show_title: true,
    slide_custom_text_format: false,
    slide_custom_bg: false,
    slide_font_size: 100,
    slide_font_color: "#FFFFFF",
    slide_font_weight: "700",
    slide_font_family: "Roboto",
    slide_line_height: 140,
    slide_letter_spacing: 3,
    slide_text_box: true,
    system_font_families: [],
    system_fonts_loading: false,
    slide_bg_color: "#000000",
    slide_bg_image: null,
    slide_bg_type: "image",
    slide_bg_opacity: 100,
    return_monitor_enabled: false,
    return_monitor: null,
    return_monitor_allow_same: false,
    return_monitor_bg_color: "#000000",
    return_monitor_text_color: "#FFFFFF",
    return_monitor_current_font_size: 92,
    return_monitor_preview_font_size: 38,
    return_monitor_text_align: "center",
    return_monitor_notes_font_size: 32,
    return_monitor_show_title: true,
    return_monitor_show_next_label: true,
    return_monitor_show_clock: false,
    return_monitor_show_counter: true,
    return_monitor_ratio: 75,
    remote_control_loading: false,
    remote_control_running: false,
    remote_control_addresses: [],
    web_output_addresses: [],
    web_output_source_options: [
      { title: "Projeção", value: "projection" },
      { title: "Retorno", value: "return_monitor" },
    ],
    remote_control_qr_code: "",
    remote_control_network_options: [],
    show_remote_control_password: false,
    remote_control_config: {
      enabled: true,
      webOutputEnabled: true,
      webOutputSource: "projection",
      host: "0.0.0.0",
      port: 1975,
      password: "",
      requirePassword: false,
    },
    automation_loading: false,
    automation_device: {
      id: "soundcraft_ui16",
      name: "Soundcraft Ui16",
      type: "soundcraft-ui",
      ip: "",
    },
    automation_config: {
      enabled: false,
      simulationMode: false,
      showStatus: true,
      devices: [],
      triggers: [],
    },
    automationOperationOptions: [
      { title: "Fade para volume", value: "fadeToDB" },
      { title: "Definir volume", value: "setFaderLevelDB" },
      { title: "Mutar", value: "mute" },
      { title: "Desmutar", value: "unmute" },
    ],
    automationTargetOptions: [
      { title: "Canal de entrada", value: "input" },
      { title: "Line In L", value: "line-left" },
      { title: "Line In R", value: "line-right" },
      { title: "Master", value: "master" },
    ],
    
    manifest,
  }),
  computed: {
    module_id() {
      return manifest.id;
    },
    module() {
      return this.$modules.get(this.module_id);
    },
    activeTabDescription() {
      return {
        1: "Personalize o tema e a experiência visual",
        2: "Defina idioma, comportamento e desempenho",
        3: "Organize reprodução, áudio e vídeo",
        4: "Configure projeção, retorno e monitores",
        5: "Conecte dispositivos pela rede local",
        6: "Crie ações automáticas para sua operação",
      }[this.tab] || "Ajuste o IASDPresenter ao seu fluxo de trabalho";
    },
    active_theme_mode: {
      get() {
        return this.$vuetify.theme.global.current.dark ? "dark" : "light";
      },
      set(mode) {
        this.setTheme(mode);
      },
    },
    rawDisplays() {
      return this.$appdata.get("system_displays") || [];
    },
    monitorList() {
      if (this.rawDisplays.length === 0) {
        return [
          { title: "Monitor 1 (Principal)", detailTitle: "Monitor 1 (Principal)", detail: "Principal", value: "Monitor 1", isPrimary: true },
          { title: "Monitor 2", detailTitle: "Monitor 2", detail: "Estendido", value: "Monitor 2", isPrimary: false },
        ];
      }
      return this.rawDisplays.map((d, index) => ({
        title: `Monitor ${Number(index) + 1} ${d.isPrimary ? "(Principal)" : "(Estendido)"}`,
        detailTitle: `Monitor ${Number(index) + 1} - ${d.bounds.width}x${d.bounds.height} - X:${d.bounds.x} Y:${d.bounds.y}${d.isPrimary ? " - Principal" : ""}`,
        detail: `${d.bounds.width}x${d.bounds.height} | X:${d.bounds.x} Y:${d.bounds.y}${d.isPrimary ? " | Principal" : ""}`,
        value: d.id,
        isPrimary: d.isPrimary,
      }));
    },
    slideMonitorList() {
      return this.monitorList.filter(m => !m.isPrimary);
    },
    slideBgPreviewUrl() {
      if (window.electronAPI) {
        return this.$localFile.toLocalAppUrl(this.slide_bg_image);
      }
      return this.slide_bg_image;
    },
    slideFontFamilies() {
      const fallback = ["Roboto", "Arial", "Segoe UI", "Verdana", "Tahoma", "Georgia", "Times New Roman", "Courier New", "DINCondensedBold"];
      return [...new Set([...fallback, ...this.system_font_families, this.slide_font_family].filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
    },
    languagesList() {
      return [
        { code: "pt", name: "Português" },
        { code: "en", name: "English" },
        { code: "es", name: "Español" },
      ];
    },
    languageName() {
      const found = this.languagesList.find(l => l.code === this.language);
      return found ? found.name : "Português";
    },
    primaryHymnalOptions() {
      return [
        { title: this.t("primary_hymnal_current"), value: "hymnal" },
        { title: this.t("primary_hymnal_1996"), value: "hymnal_1996" },
      ];
    },
    performanceRestartRequired() {
      const requestedState = this.light_mode === true && this.light_disable_hardware_acceleration === true;
      return requestedState !== this.applied_disable_hardware_acceleration;
    },
  },
  watch: {
    language(val) {
      if (!val) return;
      const currentLanguage = this.$userdata.get("language");
      this.$userdata.set("language", val);
      this.$i18n.locale = val;

      if (currentLanguage && currentLanguage !== val && window.electronAPI?.isElectron) {
        window.location.reload();
      }
    },
    show_home_history(val) {
      this.$userdata.set("show_home_history", val);
    },
    primary_hymnal(val) {
      this.$userdata.set("modules.config.primary_hymnal", val === "hymnal_1996" ? val : "hymnal");
    },
    home_layout(val) {
      this.$userdata.set("modules.config.home_layout", val || "classic");
    },
    sidebar_auto_collapse(val) {
      const enabled = val === true;
      this.$userdata.set("modules.config.sidebar_auto_collapse", enabled);
      window.dispatchEvent(new CustomEvent("sidebar-auto-collapse-change", { detail: enabled }));
    },
    light_mode(val) {
      this.$userdata.set("modules.config.light_mode", val);
      this.applyLightModeRuntimeEffects();
      this.syncElectronPerformanceConfig();
    },
    light_optimize_presentations(val) {
      this.$userdata.set("modules.config.light_optimize_presentations", val);
    },
    light_limit_projection_windows(val) {
      this.$userdata.set("modules.config.light_limit_projection_windows", val);
      this.applyLightModeRuntimeEffects();
    },
    light_disable_hardware_acceleration(val) {
      this.$userdata.set("modules.config.light_disable_hardware_acceleration", val);
      this.syncElectronPerformanceConfig();
    },
    accent_color(val) {
      const color = this.$theme.applyAccentColor(this.$vuetify, val);
      this.$userdata.set("modules.config.accent_color", color);
      if (this.accent_color !== color) {
        this.accent_color = color;
      }
    },
    media_use_internal_player(val) {
      this.$userdata.set("modules.config.media_use_internal_player", val);
    },
    media_liturgy_transition_duration(val) {
      const duration = Math.min(3, Math.max(0, Number(val) || 0));
      this.$userdata.set("modules.config.media_liturgy_transition_duration", duration);
    },
    media_sync_projection_settings(val) {
      this.$userdata.set("modules.config.media_sync_projection_settings", val);
      this.syncExternalMediaMonitors();
    },
    media_auto_project_video(val) {
      this.$userdata.set("modules.config.media_auto_project_video", val);
    },
    media_pause_on_minimize(val) {
      this.$userdata.set("modules.config.media_pause_on_minimize", val);
    },
    media_slide_monitor(val) {
      if (val !== undefined && val !== null) {
        this.$userdata.set("modules.config.media_slide_monitor", val);
        this.syncExternalMediaMonitors();
      }
    },
    media_slide_fullscreen(val) {
      this.$userdata.set("modules.config.media_slide_fullscreen", val);
      if (!this.media_sync_projection_settings) {
        this.syncExternalMediaMonitors();
      }
    },
    media_slide_disable_main_if_extended(val) {
      this.$userdata.set("modules.config.media_slide_disable_main_if_extended", val);
    },
    media_slide_minimize_player(val) {
      this.$userdata.set("modules.config.media_slide_minimize_player", val);
    },
    projection_monitor(val) {
      if (val !== undefined) {
        const nextMonitors = val ? [val] : [];
        if (JSON.stringify(this.slide_monitor) !== JSON.stringify(nextMonitors)) {
          this.slide_monitor = nextMonitors;
        }
        this.$userdata.set("modules.config.projection_monitor", val);
        this.validateReturnMonitorSelection();
      }
    },
    slide_monitor(val) {
      if (val !== undefined && val !== null) {
        this.$userdata.set("modules.config.slide_monitor", val);
        const nextProjectionMonitor = Array.isArray(val) && val.length > 0 ? val[0] : null;
        if (this.projection_monitor !== nextProjectionMonitor) {
          this.projection_monitor = nextProjectionMonitor;
        }
        this.validateReturnMonitorSelection();
        $media.syncMonitors();
        this.syncExternalMediaMonitors();
      }
    },
    slide_align(val) {
      if (val !== undefined && val !== null) {
        this.$userdata.set("modules.config.slide_align", val);
      }
    },
    slide_fullscreen(val) {
      this.$userdata.set("modules.config.slide_fullscreen", val);
      if (this.media_sync_projection_settings) {
        this.syncExternalMediaMonitors();
      }
    },
    slide_disable_main_if_extended(val) {
      this.$userdata.set("modules.config.slide_disable_main_if_extended", val);
    },
    slide_minimize_player(val) {
      this.$userdata.set("modules.config.slide_minimize_player", val);
    },
    slide_show_title(val) {
      this.$userdata.set("modules.config.slide_show_title", val);
    },
    slide_custom_text_format(val) { this.$userdata.set("modules.config.slide_custom_text_format", val); },
    slide_font_size(val) { this.$userdata.set("modules.config.slide_font_size", val); },
    slide_font_color(val) { this.$userdata.set("modules.config.slide_font_color", val); },
    slide_font_weight(val) { this.$userdata.set("modules.config.slide_font_weight", val); },
    slide_font_family(val) { this.$userdata.set("modules.config.slide_font_family", val); },
    slide_line_height(val) { this.$userdata.set("modules.config.slide_line_height", val); },
    slide_letter_spacing(val) { this.$userdata.set("modules.config.slide_letter_spacing", val); },
    slide_text_box(val) { this.$userdata.set("modules.config.slide_text_box", val); },
    slide_custom_bg(val) { this.$userdata.set("modules.config.slide_custom_bg", val); },
    slide_bg_color(val) { this.$userdata.set("modules.config.slide_bg_color", val); },
    slide_bg_image(val) { this.$userdata.set("modules.config.slide_bg_image", val); },
    slide_bg_type(val) { this.$userdata.set("modules.config.slide_bg_type", val); },
    slide_bg_opacity(val) { this.$userdata.set("modules.config.slide_bg_opacity", val); },
    return_monitor_enabled(val) {
      this.$userdata.set("modules.config.return_monitor_enabled", val);
      $media.syncReturnMonitor();
    },
    return_monitor(val) {
      this.$userdata.set("modules.config.return_monitor", val);
      this.validateReturnMonitorSelection();
      $media.syncReturnMonitor();
    },
    return_monitor_allow_same(val) {
      this.$userdata.set("modules.config.return_monitor_allow_same", val);
      this.validateReturnMonitorSelection();
      $media.syncReturnMonitor();
    },
    return_monitor_bg_color(val) { this.$userdata.set("modules.config.return_monitor_bg_color", val); },
    return_monitor_text_color(val) { this.$userdata.set("modules.config.return_monitor_text_color", val); },
    return_monitor_current_font_size(val) { this.$userdata.set("modules.config.return_monitor_current_font_size", val); },
    return_monitor_preview_font_size(val) { this.$userdata.set("modules.config.return_monitor_preview_font_size", val); },
    return_monitor_text_align(val) { this.$userdata.set("modules.config.return_monitor_text_align", val); },
    return_monitor_notes_font_size(val) { this.$userdata.set("modules.config.return_monitor_notes_font_size", val); },
    return_monitor_show_title(val) { this.$userdata.set("modules.config.return_monitor_show_title", val); },
    return_monitor_show_next_label(val) { this.$userdata.set("modules.config.return_monitor_show_next_label", val); },
    return_monitor_show_clock(val) { this.$userdata.set("modules.config.return_monitor_show_clock", val); },
    return_monitor_show_counter(val) { this.$userdata.set("modules.config.return_monitor_show_counter", val); },
    return_monitor_ratio(val) { this.$userdata.set("modules.config.return_monitor_ratio", val); },
    slideMonitorList: {
      handler(newList) {
        if (newList.length > 0 && this.rawDisplays.length > 0) {
          const unselected = this.$userdata.get("modules.config.unselected_slide_monitors") || [];
          let changed = false;
          const currentMonitors = [...this.slide_monitor];
          
          newList.forEach(m => {
            if (!currentMonitors.includes(m.value) && !unselected.includes(m.value)) {
              currentMonitors.push(m.value);
              changed = true;
            }
          });
          
          if (changed) {
            this.slide_monitor = currentMonitors;
          }
        }
      },
      immediate: true,
    },
  },
  async mounted() {
    if(this.$userdata.get("language")){
      this.language = this.$userdata.get("language");
    }

    if(this.$userdata.get("theme")){
      this.$vuetify.theme.global.name = this.$userdata.get("theme");
    }

    this.accent_color = this.$theme.getAccentColor();
    this.$theme.applyAccentColor(this.$vuetify, this.accent_color);
    
    const saved_home_history = this.$userdata.get("show_home_history");
    if (saved_home_history !== undefined && saved_home_history !== null) {
      this.$data.show_home_history = saved_home_history;
    }

    const saved_home_layout = this.$userdata.get("modules.config.home_layout");
    if (saved_home_layout) {
      this.home_layout = saved_home_layout;
    }

    const saved_primary_hymnal = this.$userdata.get("modules.config.primary_hymnal");
    if (["hymnal", "hymnal_1996"].includes(saved_primary_hymnal)) {
      this.primary_hymnal = saved_primary_hymnal;
    }

    const saved_sidebar_auto_collapse = this.$userdata.get("modules.config.sidebar_auto_collapse");
    if (saved_sidebar_auto_collapse !== undefined && saved_sidebar_auto_collapse !== null) {
      this.sidebar_auto_collapse = saved_sidebar_auto_collapse === true;
    }

    let savedSlideMonitor = this.$userdata.get("modules.config.slide_monitor");
    if (savedSlideMonitor) {
      if (!Array.isArray(savedSlideMonitor)) {
        savedSlideMonitor = [savedSlideMonitor];
      }
      this.slide_monitor = savedSlideMonitor;
      this.projection_monitor = savedSlideMonitor[0] || null;
    }
    const savedProjectionMonitor = this.$userdata.get("modules.config.projection_monitor");
    if (savedProjectionMonitor !== undefined && savedProjectionMonitor !== null) {
      this.projection_monitor = savedProjectionMonitor;
    }
    
    const savedSlideAlign = this.$userdata.get("modules.config.slide_align");
    if (savedSlideAlign) {
      this.slide_align = savedSlideAlign;
    }

    if (this.$userdata.get("modules.config.slide_fullscreen") != null) {
      this.slide_fullscreen = this.$userdata.get("modules.config.slide_fullscreen");
    }
    if (this.$userdata.get("modules.config.slide_disable_main_if_extended") != null) {
      this.slide_disable_main_if_extended = this.$userdata.get("modules.config.slide_disable_main_if_extended");
    }
    if (this.$userdata.get("modules.config.slide_minimize_player") != null) {
      this.slide_minimize_player = this.$userdata.get("modules.config.slide_minimize_player");
    }
    if (this.$userdata.get("modules.config.slide_show_title") != null) {
      this.slide_show_title = this.$userdata.get("modules.config.slide_show_title");
    }
    
    const fields = [
      "light_mode", "light_optimize_presentations", "light_limit_projection_windows", "light_disable_hardware_acceleration",
      "media_use_internal_player", "media_liturgy_transition_duration", "media_sync_projection_settings", "media_auto_project_video", "media_pause_on_minimize",
      "media_slide_monitor", "media_slide_fullscreen", "media_slide_disable_main_if_extended", "media_slide_minimize_player",
      "slide_custom_text_format", "slide_font_size", "slide_font_color", "slide_font_weight", "slide_font_family",
      "slide_line_height", "slide_letter_spacing", "slide_text_box",
      "slide_custom_bg", "slide_bg_color", "slide_bg_image", "slide_bg_type", "slide_bg_opacity",
      "return_monitor_enabled", "return_monitor", "return_monitor_allow_same",
      "return_monitor_bg_color", "return_monitor_text_color", "return_monitor_current_font_size",
      "return_monitor_preview_font_size", "return_monitor_text_align", "return_monitor_notes_font_size",
      "return_monitor_show_title", "return_monitor_show_next_label",
      "return_monitor_show_clock", "return_monitor_show_counter", "return_monitor_ratio",
    ];
    fields.forEach(field => {
      const val = this.$userdata.get(`modules.config.${field}`);
      if (val !== undefined && val !== null) {
        this[field] = val;
      }
    });

    // O arquivo do processo principal é a fonte de verdade para opções que
    // só podem ser aplicadas antes da inicialização do Electron.
    if (window.electronAPI?.getPerformanceConfig) {
      try {
        const savedPerformanceConfig = await window.electronAPI.getPerformanceConfig();
        if (typeof savedPerformanceConfig?.lightMode === "boolean") {
          this.light_mode = savedPerformanceConfig.lightMode;
        }
        if (typeof savedPerformanceConfig?.disableHardwareAcceleration === "boolean") {
          this.light_disable_hardware_acceleration = savedPerformanceConfig.disableHardwareAcceleration;
        }
        this.applied_disable_hardware_acceleration =
          savedPerformanceConfig?.appliedDisableHardwareAcceleration === true;
      } catch (error) {
        console.error("Não foi possível restaurar as configurações de desempenho", error);
      }
    }

    this.loadSystemFonts();
    this.loadRemoteControlStatus();
    this.loadAutomationConfig();
  },
  methods: {
    t(text) {
      return this.$t(`modules.${this.module_id}.${text}`);
    },
    async loadSystemFonts() {
      this.system_fonts_loading = true;
      try {
        let fonts = [];
        if (window.electronAPI?.getSystemFonts) {
          fonts = await window.electronAPI.getSystemFonts();
        } else {
          const queryLocalFonts = window.queryLocalFonts;
          if (typeof queryLocalFonts === "function") {
            const faces = await queryLocalFonts.call(window);
            fonts = faces.map(face => face.family);
          }
        }

        this.system_font_families = [...new Set(
          (Array.isArray(fonts) ? fonts : [])
            .map(font => String(font || "").trim())
            .filter(Boolean),
        )];
      } catch (error) {
        console.error("Não foi possível carregar as fontes instaladas", error);
      } finally {
        this.system_fonts_loading = false;
      }
    },
    applyLightModeRuntimeEffects() {
      if (this.light_mode && this.light_limit_projection_windows) {
        this.return_monitor_enabled = false;
        this.$popup.closeReturnMonitor();
      }
    },
    async syncElectronPerformanceConfig() {
      if (!window.electronAPI?.savePerformanceConfig) return;
      return await window.electronAPI.savePerformanceConfig({
        lightMode: this.light_mode,
        disableHardwareAcceleration: this.light_mode && this.light_disable_hardware_acceleration,
      });
    },
    async restartForPerformanceChange() {
      if (!window.electronAPI?.restartApp) {
        this.performance_restart_error = "O reinício automático não está disponível.";
        return;
      }

      this.performance_restart_loading = true;
      this.performance_restart_error = "";
      const performanceConfig = {
        lightMode: this.light_mode === true,
        disableHardwareAcceleration: this.light_mode === true && this.light_disable_hardware_acceleration === true,
      };

      try {
        await window.electronAPI.restartApp(performanceConfig);
      } catch (error) {
        this.performance_restart_error = error?.message || "Não foi possível reiniciar o aplicativo.";
        this.performance_restart_loading = false;
      }
    },
    applyRemoteControlStatus(status) {
      if (!status) return;
      this.remote_control_running = status.running === true;
      this.remote_control_addresses = status.addresses || [];
      this.web_output_addresses = status.outputAddresses || [];
      this.remote_control_qr_code = status.qrCode || "";
      this.remote_control_network_options = status.networkOptions || [];
      this.remote_control_config = {
        ...this.remote_control_config,
        ...(status.config || {}),
      };
    },
    async loadRemoteControlStatus() {
      if (!window.electronAPI?.getRemoteControlStatus) return;
      this.remote_control_loading = true;
      try {
        const status = await window.electronAPI.getRemoteControlStatus();
        this.applyRemoteControlStatus(status);
      } finally {
        this.remote_control_loading = false;
      }
    },
    async copyWebOutputAddress(address) {
      try {
        await navigator.clipboard.writeText(address);
        this.$alert.info({ text: "URL da saída web copiada.", translate: false });
      } catch (error) {
        this.$alert.error({ text: "Não foi possível copiar a URL.", error, translate: false });
      }
    },
    async updateWebOutputEnabled(value) {
      this.remote_control_config.webOutputEnabled = value === true;
      await this.saveRemoteControlConfig();
    },
    async updateWebOutputSource(value) {
      this.remote_control_config.webOutputSource = value === "return_monitor" ? "return_monitor" : "projection";
      await this.saveRemoteControlConfig();
    },
    async saveRemoteControlConfig() {
      if (!window.electronAPI?.saveRemoteControlConfig) {
        this.$alert.error({ text: "Configuração disponível apenas na versão desktop.", translate: false });
        return;
      }

      this.remote_control_loading = true;
      try {
        const status = await window.electronAPI.saveRemoteControlConfig({
          ...this.remote_control_config,
          port: Number(this.remote_control_config.port),
        });
        this.applyRemoteControlStatus(status);
        this.$alert.info({ text: "Configurações do controle remoto salvas.", translate: false });
      } catch (error) {
        this.$alert.error({ text: "Não foi possível salvar as configurações do controle remoto.", error, translate: false });
      } finally {
        this.remote_control_loading = false;
      }
    },
    async startRemoteControlServer() {
      if (!window.electronAPI?.startRemoteControlServer) return;
      this.remote_control_loading = true;
      try {
        const status = await window.electronAPI.startRemoteControlServer();
        this.applyRemoteControlStatus(status);
      } finally {
        this.remote_control_loading = false;
      }
    },
    async stopRemoteControlServer() {
      if (!window.electronAPI?.stopRemoteControlServer) return;
      this.remote_control_loading = true;
      try {
        const status = await window.electronAPI.stopRemoteControlServer();
        this.applyRemoteControlStatus(status);
      } finally {
        this.remote_control_loading = false;
      }
    },
    newAutomationId(prefix) {
      return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    },
    normalizeAutomationTarget(value) {
      return String(value || "")
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/^wss?:\/\//i, "")
        .split("/")[0]
        .trim();
    },
    normalizeAutomationConfig(config = this.automation_config) {
      const device = {
        ...this.automation_device,
        id: this.automation_device.id || "soundcraft_ui16",
        type: "soundcraft-ui",
        ip: this.normalizeAutomationTarget(this.automation_device.ip),
      };

      return {
        enabled: config.enabled === true,
        simulationMode: config.simulationMode === true,
        showStatus: config.showStatus !== false,
        devices: device.ip ? [device] : [],
        triggers: (config.triggers || []).map(trigger => ({
          ...trigger,
          actions: (trigger.actions || []).map(action => ({
            ...action,
            deviceId: device.id,
            channel: Number(action.channel) || 1,
            valueDB: Number(action.valueDB),
            fadeMs: Number(action.fadeMs) || 0,
            restoreOnMediaEnd: action.restoreOnMediaEnd === true,
            endValueDB: Number.isFinite(Number(action.endValueDB)) ? Number(action.endValueDB) : Number(action.valueDB),
            endFadeMs: Number(action.endFadeMs ?? action.fadeMs) || 0,
          })),
        })),
      };
    },
    applyAutomationConfig(config) {
      if (!config) return;
      this.automation_config = {
        ...this.automation_config,
        ...config,
        devices: Array.isArray(config.devices) ? config.devices : [],
        triggers: Array.isArray(config.triggers) ? config.triggers.map(trigger => ({
          ...trigger,
          actions: Array.isArray(trigger.actions) ? trigger.actions.map(action => ({
            ...action,
            endValueDB: Number.isFinite(Number(action.endValueDB)) ? Number(action.endValueDB) : Number(action.valueDB),
            endFadeMs: Number(action.endFadeMs ?? action.fadeMs) || 0,
          })) : [],
        })) : [],
      };

      const device = this.automation_config.devices.find(item => item.type === "soundcraft-ui");
      if (device) {
        this.automation_device = {
          ...this.automation_device,
          ...device,
        };
      }
    },
    async loadAutomationConfig() {
      const saved = this.$userdata.get("modules.config.automation");
      if (saved) this.applyAutomationConfig(saved);

      if (!window.electronAPI?.getAutomationConfig) return;
      try {
        const config = await window.electronAPI.getAutomationConfig();
        this.applyAutomationConfig(config);
        this.$userdata.set("modules.config.automation", this.normalizeAutomationConfig(config));
      } catch (error) {
        console.error("Failed to load automation config", error);
      }
    },
    async saveAutomationConfig() {
      const config = this.normalizeAutomationConfig();
      this.automation_loading = true;
      try {
        let saved = config;
        if (window.electronAPI?.saveAutomationConfig) {
          saved = await window.electronAPI.saveAutomationConfig(config);
        }
        this.applyAutomationConfig(saved);
        this.$userdata.set("modules.config.automation", saved);
        this.$alert.info({ text: "Configurações de automação salvas.", translate: false });
      } catch (error) {
        this.$alert.error({ text: "Não foi possível salvar a automação.", error, translate: false });
      } finally {
        this.automation_loading = false;
      }
    },
    addAutomationTrigger() {
      const deviceId = this.automation_device.id || "soundcraft_ui16";
      this.automation_config.triggers.push({
        id: this.newAutomationId("trigger"),
        name: "Vídeo",
        enabled: true,
        actions: [{
          id: this.newAutomationId("action"),
          deviceId,
          target: "input",
          channel: 9,
          operation: "fadeToDB",
          valueDB: -18,
          fadeMs: 800,
          restoreOnMediaEnd: false,
          endValueDB: 0,
          endFadeMs: 800,
        }],
      });
    },
    removeAutomationTrigger(index) {
      this.automation_config.triggers.splice(index, 1);
    },
    async testAutomationDevice() {
      if (!window.electronAPI?.testAutomationDevice) {
        this.$alert.error({ text: "Teste disponível apenas na versão desktop.", translate: false });
        return;
      }
      this.automation_loading = true;
      try {
        const result = await window.electronAPI.testAutomationDevice({
          ...this.automation_device,
          ip: this.normalizeAutomationTarget(this.automation_device.ip),
        });
        if (result.ok) {
          this.$alert.info({ text: "Conexão com a Soundcraft Ui realizada.", translate: false });
        } else {
          this.$alert.error({ text: result.error || "Não foi possível conectar na mesa.", translate: false });
        }
      } finally {
        this.automation_loading = false;
      }
    },
    async testAutomationTrigger(trigger) {
      await this.saveAutomationConfig();
      if (!window.electronAPI?.testAutomationTrigger) return;
      this.automation_loading = true;
      try {
        const prepared = this.normalizeAutomationConfig({ ...this.automation_config, triggers: [trigger] }).triggers[0];
        const result = await window.electronAPI.testAutomationTrigger(prepared);
        if (result.ok) {
          this.$alert.info({ text: "Gatilho executado com sucesso.", translate: false });
        } else {
          this.$alert.error({ text: result.error || "Não foi possível executar o gatilho.", translate: false });
        }
      } finally {
        this.automation_loading = false;
      }
    },
    async syncExternalMediaMonitors() {
      const isExternalMediaActive = Boolean(this.$appdata.get("modules.external_media.filePath"));
      if (!isExternalMediaActive) return;

      const syncSettings = this.$userdata.get("modules.config.media_sync_projection_settings") !== false;
      let selectedMonitors = syncSettings
        ? this.$userdata.get("modules.config.slide_monitor") || []
        : this.$userdata.get("modules.config.media_slide_monitor") || [];
      const fullscreen = syncSettings
        ? this.$userdata.get("modules.config.slide_fullscreen") !== false
        : this.$userdata.get("modules.config.media_slide_fullscreen") !== false;

        
      if (!Array.isArray(selectedMonitors)) {
        selectedMonitors = selectedMonitors ? [selectedMonitors] : [];
      }
      
      if (window.electronAPI && window.electronAPI.getDisplays) {
        const displays = await window.electronAPI.getDisplays();
        if (displays && displays.length > 1) {
          const primary = displays.find(d => d.isPrimary) || displays[0];
          selectedMonitors = selectedMonitors.filter(m => m !== primary.id);
          
          await this.$popup.syncMonitors(selectedMonitors, "external_media", isExternalMediaActive, fullscreen);
        }
      }
    },
    identifyMonitors() {
      if (window.electronAPI && window.electronAPI.identifyDisplays) {
        window.electronAPI.identifyDisplays();
      }
    },
    validateReturnMonitorSelection() {
      if (!this.return_monitor || this.return_monitor_allow_same) return;
      const projectionMonitors = Array.isArray(this.slide_monitor) ? this.slide_monitor : [];
      if (projectionMonitors.includes(this.return_monitor)) {
        this.return_monitor = null;
        this.$alert.info({
          text: "O monitor de retorno deve ser diferente do monitor de projeção.",
          translate: false,
        });
      }
    },
    async testReturnMonitor() {
      this.validateReturnMonitorSelection();
      if (!this.return_monitor) return;
      this.return_monitor_enabled = true;
      await this.$popup.syncReturnMonitor(this.return_monitor, true);
    },
    toggleSlideMonitor(val) {
      let unselected = this.$userdata.get("modules.config.unselected_slide_monitors") || [];
      if (this.slide_monitor.includes(val)) {
        this.slide_monitor = this.slide_monitor.filter(m => m !== val);
        if (!unselected.includes(val)) unselected.push(val);
      } else {
        this.slide_monitor = [...this.slide_monitor, val];
        unselected = unselected.filter(m => m !== val);
      }
      this.$userdata.set("modules.config.unselected_slide_monitors", unselected);
    },
    toggleMediaSlideMonitor(val) {
      if (this.media_slide_monitor.includes(val)) {
        this.media_slide_monitor = this.media_slide_monitor.filter(m => m !== val);
      } else {
        this.media_slide_monitor = [...this.media_slide_monitor, val];
      }
    },
    async onBgImageSelect(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      const isVideo = file.type === "video/mp4" || /\.mp4$/i.test(file.name);
      const isImage = file.type.startsWith("image/");
      if (!isVideo && !isImage) {
        this.$alert.error({ text: "Selecione um arquivo de imagem ou um vÃ­deo .mp4.", translate: false });
        event.target.value = "";
        return;
      }

      try {
        this.slide_bg_type = isVideo ? "video" : "image";
        if (window.electronAPI?.saveCustomBackground) {
          const buffer = await file.arrayBuffer();
          const savedPath = await window.electronAPI.saveCustomBackground(file.name, buffer);
          if (!savedPath) throw new Error("Falha ao salvar arquivo local");
          this.slide_bg_image = savedPath;
        } else {
          const reader = new FileReader();
          reader.onload = (e) => {
            this.slide_bg_image = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        this.$alert.error({ text: "Erro ao carregar o arquivo selecionado.", error, translate: false });
      } finally {
        event.target.value = "";
      }
    },
    resetSlideConfigs() {
      this.slide_monitor = [];
      this.slide_align = "Centro";
      this.slide_fullscreen = true;
      this.slide_disable_main_if_extended = true;
      this.slide_minimize_player = false;
      this.slide_show_title = true;
      this.slide_custom_text_format = false;
      this.slide_font_size = 100;
      this.slide_font_color = "#FFFFFF";
      this.slide_font_weight = "700";
      this.slide_font_family = "Roboto";
      this.slide_line_height = 140;
      this.slide_letter_spacing = 3;
      this.slide_text_box = true;
      this.slide_custom_bg = false;
      this.slide_bg_color = "#000000";
      this.slide_bg_image = null;
      this.slide_bg_type = "image";
      this.slide_bg_opacity = 100;
      this.return_monitor_enabled = false;
      this.return_monitor = null;
      this.return_monitor_allow_same = false;
      this.return_monitor_bg_color = "#000000";
      this.return_monitor_text_color = "#FFFFFF";
      this.return_monitor_current_font_size = 92;
      this.return_monitor_preview_font_size = 38;
      this.return_monitor_text_align = "center";
      this.return_monitor_notes_font_size = 32;
      this.return_monitor_show_title = true;
      this.return_monitor_show_next_label = true;
      this.return_monitor_show_clock = false;
      this.return_monitor_show_counter = true;
      this.return_monitor_ratio = 75;
      this.accent_color = this.$theme.defaultPrimary;
    },
    resetMediaConfigs() {
      this.media_use_internal_player = true;
      this.media_sync_projection_settings = true;
      this.media_liturgy_transition_duration = 0.6;
      this.media_auto_project_video = true;
      this.media_pause_on_minimize = false;
      this.media_slide_monitor = [];
      this.media_slide_fullscreen = true;
      this.media_slide_disable_main_if_extended = true;
      this.media_slide_minimize_player = false;
    },
    toggleSidebar() {
      const mainEl = document.querySelector(".main-container");
      if (mainEl) {
        mainEl.dispatchEvent(new CustomEvent("toggle-sidebar"));
      }
    },
    setTheme(theme_id) {
      this.$vuetify.theme.global.name = theme_id;
      this.$userdata.set("theme", theme_id);
      this.$appdata.set("is_dark", this.$vuetify.theme.global.current.dark);
      this.$theme.applyAccentColor(this.$vuetify, this.accent_color);
    },
    resetHistory() {
      this.$alert.yesno(
        { text: "Tem certeza que deseja resetar o histórico de coletâneas e músicas mais tocadas?", translate: false },
        (resp) => {
          if (resp === "yes") {
            this.$history.clearAll();
            this.$alert.info({ text: "Histórico resetado com sucesso! Atualize a página inicial para ver as mudanças.", translate: false });
          }
        },
      );
    },
    async clearAllData() {
      this.$alert.yesno(
        { text: "ATENÇÃO: Você tem certeza que deseja apagar todos os bancos de dados, capas, músicas e mídias baixadas do aplicativo?<br><br>Isso exigirá um novo download de todos os arquivos essenciais e irá reiniciar o programa.", translate: false },
        async (resp) => {
          if (resp === "yes") {
            if (window.electronAPI) {
              const success = await window.electronAPI.clearAllData();
              if (success) {
                this.$alert.info({ text: "Todos os arquivos locais foram removidos com sucesso. O aplicativo será recarregado agora.", translate: false }, () => {
                  window.location.reload();
                });
              } else {
                this.$alert.error({ text: "Ocorreu um erro ao tentar limpar os dados.", translate: false });
              }
            } else {
              this.$alert.error({ text: "Apenas disponível na versão desktop.", translate: false });
            }
          }
        },
      );
    },
  },
};
</script>

<style scoped>
.settings-section h3 {
  opacity: 0.9;
}

.config-page,
.config-page *,
.config-page *::before,
.config-page *::after { box-sizing: border-box; }
.config-page {
  background:
    radial-gradient(circle at 88% 2%, rgba(var(--accent-blue-rgb), .065), transparent 28%),
    radial-gradient(circle at 5% 100%, rgba(255, 107, 53, .04), transparent 25%),
    var(--main-bg);
}
.config-header {
  width: 100%;
  min-height: 150px;
  padding: 24px clamp(24px, 3vw, 44px) 0 !important;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 20px;
  border-bottom: 1px solid var(--border-color);
  background: color-mix(in srgb, var(--main-bg) 93%, transparent) !important;
}
.config-title-group { min-width: 0; display: flex; align-items: center; gap: 14px; }
.config-title-group .module-icon-box { margin: 0 !important; }
.config-title-group h2 { margin: 0; }
.config-title-group p { margin: 5px 0 0; color: var(--sidebar-text-secondary); font-size: 13px; }
.config-tabs { min-width: 0; display: flex; align-items: flex-end; gap: 5px; overflow-x: auto; scrollbar-width: none; }
.config-tabs::-webkit-scrollbar { display: none; }
.config-tabs button { position: relative; min-width: max-content; min-height: 50px; padding: 0 16px 12px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; color: var(--sidebar-text-secondary); border: 0; background: transparent; cursor: pointer; font: inherit; font-size: 13px; font-weight: 650; transition: color .18s ease, background .18s ease; }
.config-tabs button::after { content: ""; position: absolute; right: 12px; bottom: 0; left: 12px; height: 3px; border-radius: 99px 99px 0 0; background: transparent; transform: scaleX(.45); transition: background .18s ease, transform .18s ease; }
.config-tabs button:hover { color: var(--sidebar-text); background: linear-gradient(to top, var(--sidebar-hover), transparent 70%); }
.config-tabs button.active { color: var(--accent-blue); }
.config-tabs button.active::after { background: var(--accent-blue); box-shadow: 0 -3px 12px rgba(var(--accent-blue-rgb), .25); transform: scaleX(1); }
.config-content { min-height: 0; padding: 28px clamp(24px, 3vw, 44px) 44px !important; overflow: hidden; background: transparent !important; }
.config-content :deep(.v-window),
.config-content :deep(.v-window__container),
.config-content :deep(.v-window-item) { min-height: 0; height: 100%; }
.config-content :deep(.v-window-item > .overflow-auto) { padding: 0 8px 24px !important; }
.config-content :deep(.settings-container) { width: min(100%, 1080px); max-width: 1080px !important; margin: 0 auto !important; padding: 0 0 20px !important; gap: 18px !important; }
.config-page :deep(.v-field:not(.v-field--variant-plain):not(.v-field--variant-underlined)) { border-radius: 12px; background: color-mix(in srgb, var(--card-bg) 93%, var(--main-bg)); }
.config-page :deep(.v-field--variant-outlined .v-field__outline) { color: color-mix(in srgb, var(--sidebar-text-secondary) 42%, var(--border-color)); }
.config-page :deep(.v-field--focused) { box-shadow: 0 0 0 3px rgba(var(--accent-blue-rgb), .1); }
.config-page :deep(.v-field--focused .v-field__outline) { color: var(--accent-blue); }
.config-page :deep(.v-label) { color: var(--sidebar-text-secondary); font-size: 13px; }
.config-page :deep(.v-input__details) { color: var(--sidebar-text-secondary); }
.config-page :deep(.v-btn-toggle) { padding: 4px; gap: 4px; border: 1px solid var(--border-color); border-radius: 13px !important; background: var(--main-bg) !important; box-shadow: none !important; }
.config-page :deep(.v-btn-toggle .v-btn) { border: 0 !important; border-radius: 9px !important; }
.config-page :deep(.v-btn-toggle .v-btn--active) { color: var(--accent-blue); background: var(--accent-soft); box-shadow: 0 3px 10px rgba(var(--accent-blue-rgb), .1); }
.config-page :deep(.v-switch .v-selection-control__wrapper) { color: var(--sidebar-text-secondary); }
.config-page :deep(.v-switch .v-selection-control--dirty .v-selection-control__wrapper) { color: var(--accent-blue); }
.config-page :deep(.v-alert) { border: 1px solid color-mix(in srgb, currentColor 17%, var(--border-color)); border-radius: 14px !important; }
.config-page :deep(.v-divider) { border-color: var(--border-color); opacity: .75 !important; }
.config-page :deep(.v-chip) { font-weight: 650; }
.config-page :deep(.settings-card h3) { letter-spacing: -.015em; }
.config-page :deep(.legacy-panel-content > .v-card-text) { display: flex; flex-direction: column; gap: 12px; padding-top: 20px !important; }
.config-page :deep(.legacy-panel-content > .v-card-text > *) { margin-top: 0 !important; margin-bottom: 0 !important; }
.config-page :deep(.legacy-panel-content > .v-card-text > .v-divider) { display: none; }
.config-page :deep(.legacy-panel-content > .v-card-text > .d-flex),
.config-page :deep(.legacy-panel-content > .v-card-text > div:not(.monitor-showcase):not(.projection-block):not(.projection-grid)) { min-width: 0; padding: 15px 16px; border: 1px solid var(--border-color); border-radius: 14px; background: color-mix(in srgb, var(--card-bg) 82%, var(--main-bg)); transition: border-color .18s ease, background .18s ease, transform .18s ease; }
.config-page :deep(.legacy-panel-content > .v-card-text > .d-flex:hover),
.config-page :deep(.legacy-panel-content > .v-card-text > div:not(.monitor-showcase):not(.projection-block):not(.projection-grid):hover) { border-color: rgba(var(--accent-blue-rgb), .25); background: color-mix(in srgb, var(--card-bg) 90%, var(--accent-soft)); transform: translateY(-1px); }
.config-page :deep(.legacy-panel-content > .v-card-text > .d-flex > .v-icon),
.config-page :deep(.legacy-panel-content > .v-card-text > div > .d-flex:first-child > .v-icon) { width: 38px; height: 38px; margin-right: 12px !important; display: inline-grid; flex: 0 0 38px; place-items: center; border: 1px solid rgba(var(--accent-blue-rgb), .16); border-radius: 11px; background: var(--accent-soft); }
.config-page :deep(.legacy-panel-content h3) { margin: 0; color: var(--sidebar-text); font-size: 13px !important; font-weight: 740 !important; line-height: 1.3 !important; letter-spacing: -.01em; }
.config-page :deep(.legacy-panel-content .text-caption) { color: var(--sidebar-text-secondary) !important; font-size: 10px !important; line-height: 1.45 !important; }
.config-page :deep(.legacy-panel-content .text-subtitle-1) { color: var(--sidebar-text); font-size: 12px !important; font-weight: 720 !important; }
.config-page :deep(.legacy-panel-content .v-switch) { flex: 0 0 auto; }
.config-page :deep(.legacy-panel-content .v-switch .v-label) { color: var(--sidebar-text); font-size: 11px; font-weight: 650; opacity: 1; }
.config-page :deep(.legacy-panel-content .pl-4[style*="border-left"]) { margin-top: 12px !important; padding: 14px !important; border: 1px solid var(--border-color) !important; border-radius: 13px; background: color-mix(in srgb, var(--main-bg) 66%, transparent); }
.config-page :deep(.legacy-panel-content .v-slider) { margin-top: 8px; }
.config-page :deep(.legacy-panel-content .v-btn) { min-height: 40px; }
.config-page :deep(.legacy-panel-content .v-alert) { margin-top: 4px; }
.config-page :deep(.legacy-panel-content .cursor-pointer) { border-radius: 14px !important; box-shadow: 0 6px 18px rgba(15,37,68,.055) !important; transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease !important; }
.config-page :deep(.legacy-panel-content .cursor-pointer:hover) { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,37,68,.1) !important; }
.config-page :deep(.legacy-panel-content .projection-block) { border-radius: 15px; background: color-mix(in srgb, var(--card-bg) 83%, var(--main-bg)); box-shadow: inset 0 1px rgba(255,255,255,.12); }
.config-page :deep(.legacy-panel-content .projection-block > .d-flex:first-child .v-icon) { width: 34px; height: 34px; margin-right: 10px !important; display: inline-grid; place-items: center; border-radius: 10px; background: var(--accent-soft); }
.config-page :deep(.legacy-panel-content .v-btn-toggle) { min-height: 48px; }
.config-page :deep(.legacy-panel-content .v-chip) { border-radius: 9px; }
.config-page :deep(.legacy-panel-content img) { border-radius: 14px; }
.monitor-showcase { width: 100%; padding: 18px 0 26px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 250px)); justify-content: center; gap: 32px; }
.monitor-device { min-width: 0; display: flex; flex-direction: column; align-items: center; color: var(--sidebar-text-secondary); transition: transform .2s ease; }
.monitor-device:hover { transform: translateY(-3px); }
.monitor-frame { position: relative; z-index: 2; width: 238px; height: 148px; overflow: hidden; color: #8fa6c6; border: 1px solid rgba(116, 143, 181, .35); border-radius: 17px; background: linear-gradient(145deg, #111c2c, #18283d); box-shadow: 0 16px 34px rgba(8, 20, 39, .2), inset 0 0 0 4px rgba(4, 12, 24, .28); transition: border-color .2s ease, box-shadow .2s ease; }
.monitor-device.primary .monitor-frame { color: #95ceff; border-color: color-mix(in srgb, var(--accent-blue) 65%, #8abfff); background: radial-gradient(circle at 78% 15%, rgba(72, 155, 255, .28), transparent 28%), linear-gradient(145deg, #06182f, #0b315b 66%, #0d4d80); box-shadow: 0 18px 40px rgba(var(--accent-blue-rgb), .28), inset 0 0 0 4px rgba(5, 21, 42, .4); }
.monitor-toolbar { height: 32px; padding: 0 12px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; border-bottom: 1px solid rgba(151, 183, 224, .13); background: rgba(1, 8, 19, .25); }
.monitor-toolbar > span { display: flex; gap: 4px; }.monitor-toolbar i { width: 5px; height: 5px; border-radius: 50%; background: currentColor; opacity: .35; }.monitor-toolbar strong { color: currentColor; font-size: 8px; letter-spacing: .15em; }.monitor-toolbar .v-icon { justify-self: end; }
.monitor-screen-content { position: relative; height: calc(100% - 32px); display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; }
.monitor-screen-content::before { content: ""; position: absolute; inset: 0; opacity: .22; background-image: linear-gradient(rgba(124, 180, 240, .16) 1px, transparent 1px),linear-gradient(90deg, rgba(124, 180, 240, .16) 1px, transparent 1px); background-size: 18px 18px; mask-image: linear-gradient(to bottom, transparent, #000 30%, #000); }
.monitor-screen-content::after { content: ""; position: absolute; width: 150px; height: 150px; top: 25px; border: 1px solid currentColor; border-radius: 50%; opacity: .09; }
.monitor-scan-line { position: absolute; right: 13px; left: 13px; top: 22px; height: 1px; background: linear-gradient(90deg, transparent, currentColor, transparent); box-shadow: 0 0 9px currentColor; opacity: .38; }
.monitor-number { position: relative; z-index: 1; color: #fff; font-size: 40px; font-weight: 750; line-height: .95; letter-spacing: -.05em; text-shadow: 0 4px 18px rgba(0,0,0,.32); }.monitor-screen-content strong { position: relative; z-index: 1; margin-top: 8px; color: currentColor; font-size: 12px; letter-spacing: .04em; }.monitor-screen-content small { position: relative; z-index: 1; margin-top: 3px; color: currentColor; font-size: 8px; font-weight: 800; letter-spacing: .16em; opacity: .64; }
.monitor-neck { width: 36px; height: 17px; background: linear-gradient(to right, #17263a, #31445d 50%, #17263a); }.monitor-device.primary .monitor-neck { background: linear-gradient(to right, #092849, #14629b 50%, #092849); }.monitor-base { width: 92px; height: 7px; border-radius: 99px 99px 5px 5px; background: linear-gradient(to right, #17263a, #3a506c 50%, #17263a); box-shadow: 0 5px 10px rgba(0,0,0,.16); }.monitor-device.primary .monitor-base { background: linear-gradient(to right, #092849, #1680bd 50%, #092849); }
.monitor-meta { width: 238px; margin-top: 13px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid var(--border-color); border-radius: 11px; background: color-mix(in srgb, var(--card-bg) 92%, var(--main-bg)); }.monitor-meta span { min-width: 0; display: flex; align-items: center; gap: 6px; color: var(--sidebar-text); font-size: 10px; font-weight: 650; }.monitor-meta span i { width: 6px; height: 6px; flex: 0 0 6px; border-radius: 50%; background: #8090a6; }.monitor-meta span.online i { background: #21c77a; box-shadow: 0 0 7px rgba(33,199,122,.55); }.monitor-meta small { flex: 0 0 auto; color: var(--sidebar-text-secondary); font-size: 9px; }
.automation-settings { max-width: 1080px !important; }
.automation-overview,
.automation-device-card,
.triggers-workspace { overflow: hidden; border: 1px solid var(--border-color); border-radius: 18px; background: color-mix(in srgb, var(--card-bg) 97%, var(--main-bg)); box-shadow: 0 12px 32px rgba(15, 37, 68, .07); }
.automation-overview { position: relative; padding: 24px; background: radial-gradient(circle at 92% 0, rgba(var(--accent-blue-rgb), .18), transparent 31%), linear-gradient(135deg, color-mix(in srgb, var(--card-bg) 96%, #102b50), color-mix(in srgb, var(--card-bg) 94%, var(--main-bg))); }
.automation-overview::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: .13; background-image: linear-gradient(rgba(var(--accent-blue-rgb), .28) 1px, transparent 1px), linear-gradient(90deg, rgba(var(--accent-blue-rgb), .28) 1px, transparent 1px); background-size: 26px 26px; mask-image: linear-gradient(90deg, transparent 38%, #000); }
.automation-overview-main { position: relative; z-index: 1; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 17px; }
.automation-hero-icon { width: 58px; height: 58px; display: grid; place-items: center; color: var(--accent-blue); border: 1px solid rgba(var(--accent-blue-rgb), .2); border-radius: 16px; background: linear-gradient(145deg, rgba(var(--accent-blue-rgb), .17), rgba(var(--accent-blue-rgb), .06)); box-shadow: inset 0 1px rgba(255,255,255,.2), 0 9px 22px rgba(var(--accent-blue-rgb), .12); }
.automation-overview.active .automation-hero-icon { color: #fff; border-color: transparent; background: linear-gradient(145deg, color-mix(in srgb, var(--accent-blue) 82%, #5ea6ff), var(--accent-blue)); box-shadow: 0 10px 25px rgba(var(--accent-blue-rgb), .27); }
.automation-eyebrow { display: flex; align-items: center; gap: 7px; color: var(--accent-blue); font-size: 10px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.automation-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #8996a9; box-shadow: 0 0 0 4px rgba(137,150,169,.12); }
.automation-overview.active .automation-status-dot { background: #20c77a; box-shadow: 0 0 0 4px rgba(32,199,122,.13), 0 0 10px rgba(32,199,122,.52); }
.automation-overview-copy h3,
.device-card-intro h3,
.triggers-title-line h3 { margin: 5px 0 0; color: var(--sidebar-text); font-size: 17px; font-weight: 750; line-height: 1.25; letter-spacing: -.02em; }
.automation-overview-copy p,
.device-card-intro p,
.triggers-toolbar p { margin: 5px 0 0; color: var(--sidebar-text-secondary); font-size: 12px; line-height: 1.5; }
.automation-master-control { min-width: 138px; padding: 9px 12px 9px 15px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border: 1px solid var(--border-color); border-radius: 13px; background: color-mix(in srgb, var(--card-bg) 82%, transparent); }
.automation-master-control > span { color: var(--sidebar-text); font-size: 11px; font-weight: 750; }
.automation-master-control :deep(.v-switch) { flex: 0 0 auto; }
.automation-options-grid { position: relative; z-index: 1; margin-top: 22px; padding-top: 18px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; border-top: 1px solid var(--border-color); }
.automation-option { min-width: 0; padding: 13px 14px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 11px; border: 1px solid var(--border-color); border-radius: 13px; background: color-mix(in srgb, var(--card-bg) 84%, transparent); cursor: pointer; transition: border-color .18s ease, background .18s ease, transform .18s ease; }
.automation-option:hover { border-color: rgba(var(--accent-blue-rgb), .34); background: color-mix(in srgb, var(--card-bg) 90%, var(--accent-soft)); transform: translateY(-1px); }
.automation-option-icon { width: 36px; height: 36px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 10px; background: var(--accent-soft); }
.automation-option-copy { min-width: 0; display: flex; flex-direction: column; }
.automation-option-copy strong { color: var(--sidebar-text); font-size: 12px; font-weight: 720; }
.automation-option-copy small { margin-top: 2px; overflow: hidden; color: var(--sidebar-text-secondary); font-size: 10px; line-height: 1.35; text-overflow: ellipsis; white-space: nowrap; }
.automation-device-card { padding: 22px; }
.device-card-intro { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 15px; }
.device-visual { position: relative; width: 54px; height: 54px; display: grid; place-items: center; color: #fff; border-radius: 15px; background: linear-gradient(145deg, #11243e, #0a4a75); box-shadow: 0 10px 24px rgba(10,43,76,.2); }
.device-signal { position: absolute; right: 7px; bottom: 7px; display: flex; align-items: flex-end; gap: 2px; }
.device-signal i { width: 2px; border-radius: 2px; background: #54d6ff; box-shadow: 0 0 5px rgba(84,214,255,.6); }.device-signal i:nth-child(1) { height: 4px; }.device-signal i:nth-child(2) { height: 7px; }.device-signal i:nth-child(3) { height: 10px; }
.device-fields { margin-top: 20px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.device-card-footer { margin-top: 18px; padding-top: 17px; display: flex; align-items: center; justify-content: space-between; gap: 14px; border-top: 1px solid var(--border-color); }
.device-network-hint { display: flex; align-items: center; gap: 7px; color: var(--sidebar-text-secondary); font-size: 10px; font-weight: 650; }
.device-actions { display: flex; justify-content: flex-end; gap: 9px; flex-wrap: wrap; }
.triggers-workspace { padding: 22px; }
.triggers-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
.triggers-title-line { display: flex; align-items: center; gap: 9px; }
.trigger-count { min-width: 25px; height: 20px; padding: 0 8px; display: inline-flex; align-items: center; justify-content: center; color: var(--accent-blue); border: 1px solid rgba(var(--accent-blue-rgb), .18); border-radius: 99px; background: var(--accent-soft); font-size: 10px; font-weight: 800; }
.automation-empty { margin-top: 20px; padding: 42px 24px; display: flex; flex-direction: column; align-items: center; text-align: center; border: 1px dashed color-mix(in srgb, var(--accent-blue) 32%, var(--border-color)); border-radius: 16px; background: radial-gradient(circle at 50% 25%, rgba(var(--accent-blue-rgb), .09), transparent 34%), color-mix(in srgb, var(--main-bg) 60%, transparent); }
.automation-empty-icon { width: 62px; height: 62px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 18px; background: var(--accent-soft); box-shadow: 0 10px 25px rgba(var(--accent-blue-rgb), .12); }
.automation-empty h3 { margin: 16px 0 0; color: var(--sidebar-text); font-size: 15px; }.automation-empty p { max-width: 450px; margin: 7px 0 17px; color: var(--sidebar-text-secondary); font-size: 11px; line-height: 1.55; }
.trigger-list { margin-top: 20px; display: flex; flex-direction: column; gap: 14px; }
.trigger-card { overflow: hidden; border: 1px solid var(--border-color); border-radius: 16px; background: color-mix(in srgb, var(--card-bg) 97%, var(--main-bg)); box-shadow: 0 7px 20px rgba(16,38,67,.055); transition: border-color .2s ease, opacity .2s ease, transform .2s ease; }
.trigger-card:hover { border-color: rgba(var(--accent-blue-rgb), .28); transform: translateY(-1px); }.trigger-card.disabled { opacity: .7; }
.trigger-card-header { padding: 16px; display: grid; grid-template-columns: auto minmax(240px, 1fr) auto; align-items: center; gap: 15px; border-bottom: 1px solid var(--border-color); background: linear-gradient(90deg, rgba(var(--accent-blue-rgb), .055), transparent 65%); }
.trigger-identity { display: flex; align-items: center; gap: 10px; }
.trigger-index { width: 36px; height: 36px; display: grid; place-items: center; color: var(--accent-blue); border: 1px solid rgba(var(--accent-blue-rgb), .18); border-radius: 10px; background: var(--accent-soft); font-size: 11px; font-weight: 800; }
.trigger-identity > div { min-width: 105px; display: flex; flex-direction: column; }.trigger-identity strong { color: var(--sidebar-text); font-size: 11px; }.trigger-identity small { margin-top: 2px; color: var(--sidebar-text-secondary); font-size: 9px; }
.trigger-name-field { min-width: 0; }
.trigger-header-actions { display: flex; align-items: center; gap: 8px; }
.trigger-enabled-control { height: 40px; padding-left: 11px; display: flex; align-items: center; gap: 3px; border: 1px solid var(--border-color); border-radius: 11px; cursor: pointer; }.trigger-enabled-control > span { color: var(--sidebar-text-secondary); font-size: 10px; font-weight: 700; }
.trigger-action { padding: 17px; background: color-mix(in srgb, var(--main-bg) 40%, transparent); }
.trigger-action-title { margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }.trigger-action-title > span { width: 32px; height: 32px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 9px; background: var(--accent-soft); }.trigger-action-title > div { display: flex; flex-direction: column; }.trigger-action-title strong { color: var(--sidebar-text); font-size: 11px; }.trigger-action-title small { margin-top: 1px; color: var(--sidebar-text-secondary); font-size: 9px; }
.trigger-action-grid { display: grid; grid-template-columns: minmax(180px, 1.35fr) minmax(155px, 1fr) repeat(3, minmax(105px, .62fr)); gap: 11px; }
.restore-control { margin-top: 13px; padding: 11px 12px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; border: 1px solid var(--border-color); border-radius: 12px; background: color-mix(in srgb, var(--card-bg) 80%, transparent); cursor: pointer; }.restore-icon { width: 32px; height: 32px; display: grid; place-items: center; color: var(--accent-blue); border-radius: 9px; background: var(--accent-soft); }.restore-copy { display: flex; flex-direction: column; }.restore-copy strong { color: var(--sidebar-text); font-size: 10px; }.restore-copy small { margin-top: 1px; color: var(--sidebar-text-secondary); font-size: 9px; }
.trigger-end-grid { margin-top: 12px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 11px; }
.trigger-card-footer { min-height: 59px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border-top: 1px solid var(--border-color); }.trigger-card-footer > span { display: flex; align-items: center; gap: 6px; color: var(--sidebar-text-secondary); font-size: 9px; }
@media (max-width: 980px) {
  .trigger-card-header { grid-template-columns: auto minmax(0, 1fr); }.trigger-header-actions { grid-column: 1 / -1; justify-content: flex-end; }.trigger-action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .config-header { min-height: 142px; padding: 18px 16px 0 !important; }
  .config-tabs button { min-height: 47px; padding-inline: 12px; }
  .config-content { padding: 20px 12px 30px !important; }
  .config-content :deep(.v-window-item > .overflow-auto) { padding-inline: 4px !important; }
  .config-page :deep(.legacy-panel-content > .v-card-text > .d-flex) { align-items: stretch !important; flex-direction: column; gap: 13px; }
  .config-page :deep(.legacy-panel-content > .v-card-text > .d-flex > .v-btn),
  .config-page :deep(.legacy-panel-content > .v-card-text > .d-flex > .v-select),
  .config-page :deep(.legacy-panel-content > .v-card-text > .d-flex > .v-text-field) { width: 100%; max-width: none !important; }
  .config-page :deep(.legacy-panel-content > .v-card-text > .d-flex > .v-switch) { align-self: flex-end; }
  .automation-overview-main { grid-template-columns: auto minmax(0, 1fr); }.automation-master-control { grid-column: 1 / -1; }.automation-options-grid, .device-fields { grid-template-columns: 1fr; }.device-card-footer, .triggers-toolbar, .trigger-card-footer { align-items: stretch; flex-direction: column; }.device-actions { justify-content: stretch; }.device-actions :deep(.v-btn), .triggers-toolbar :deep(.v-btn), .trigger-card-footer :deep(.v-btn) { width: 100%; }.trigger-card-header { grid-template-columns: 1fr; }.trigger-header-actions { grid-column: auto; justify-content: space-between; }.trigger-action-grid, .trigger-end-grid { grid-template-columns: 1fr; }
}
</style>
