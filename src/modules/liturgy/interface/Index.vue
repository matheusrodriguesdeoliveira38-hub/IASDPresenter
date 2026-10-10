<template>
  <v-slide-y-reverse-transition>
    <div v-if="module?.show" ref="moduleContainer" class="module-full-page dashboard-home liturgy-page d-flex flex-column">
      <!-- Top Bar -->
      <div class="search-header pb-0 flex-shrink-0" style="padding-top: 24px; padding-left: 24px; padding-right: 24px; display: flex; align-items: center;">
        <MenuToggleButton style="margin-right: 16px;" @toggle-sidebar="toggleSidebar" />
        <div class="d-flex align-center mr-auto">
          <div class="module-icon-box d-flex align-center justify-center mr-4">
            <v-icon :icon="module.icon" size="24" />
          </div>
          <h2 class="section-title mb-0" style="color: var(--sidebar-text); font-size: 24px; font-weight: 600; line-height: 1;">
            {{ t('title') }}
          </h2>
        </div>
        <div class="d-flex align-center flex-shrink-0" style="gap: 8px;">
<v-btn variant="tonal" color="primary" prepend-icon="mdi-calendar-clock" @click="showScheduledManager = true">
Itens Agendados
</v-btn>
          <v-btn
            icon
            variant="tonal"
            color="primary"
            size="small"
            @click="importLiturgy"
          >
            <v-icon size="20">
              mdi-import
            </v-icon>
            <v-tooltip
              activator="parent"
              location="bottom"
              open-delay="300"
              content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
            >
              {{ t('actions.import_all') }}
            </v-tooltip>
          </v-btn>
          <v-btn
            icon
            variant="tonal"
            color="primary"
            size="small"
            @click="exportLiturgy"
          >
            <v-icon size="20">
              mdi-export
            </v-icon>
            <v-tooltip
              activator="parent"
              location="bottom"
              open-delay="300"
              content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
            >
              {{ t('actions.export_all') }}
            </v-tooltip>
          </v-btn>
        </div>
      </div>

      <!-- Segmented Control for Days -->
      <div class="liturgy-page-strip px-6 py-4 flex-shrink-0" style="border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.05));">
        <div 
          style="background: rgba(128, 128, 128, 0.15); border-radius: 12px; padding: 4px; display: flex; gap: 4px; width: 100%; overflow-x: auto;"
          @wheel.prevent="onCustomWheelScroll"
        >
          <v-btn
            v-for="day in dayOptions.filter(d => d.value !== 'custom')"
            :key="day.value"
            :color="selectedDay === day.value ? 'primary' : undefined"
            :variant="selectedDay === day.value ? 'flat' : 'text'"
            class="flex-grow-1 text-none font-weight-bold rounded-lg"
            :style="{ color: selectedDay === day.value ? '#fff' : 'var(--sidebar-text)', letterSpacing: 0, height: '40px', minWidth: isCompactView ? '50px' : '80px' }"
            @click="selectedDay = day.value; onDayChange()"
          >
            {{ isCompactView ? day.label.substring(0, 3) : day.label }}
          </v-btn>
          
          <v-divider vertical class="mx-1 my-2" style="opacity: 0.1;" />

          <v-btn
            :color="selectedDay === 'custom' ? 'primary' : undefined"
            :variant="selectedDay === 'custom' ? 'flat' : 'text'"
            class="flex-grow-1 text-none font-weight-bold rounded-lg"
            :style="{ color: selectedDay === 'custom' ? '#fff' : 'var(--sidebar-text)', letterSpacing: 0, height: '40px', minWidth: isCompactView ? '0' : '100px' }"
            prepend-icon="mdi-star-outline"
            @click="selectedDay = 'custom'; onDayChange()"
          >
            {{ isCompactView ? 'Avul.' : (dayOptions.find(d => d.value === 'custom')?.label || 'Avulsa') }}
          </v-btn>
        </div>
      </div>

      <!-- Custom liturgy selector -->
      <v-expand-transition>
        <div 
          v-if="selectedDay === 'custom'" 
          class="liturgy-page-strip px-6 py-3 d-flex align-center flex-shrink-0 custom-liturgy-scroll"
          style="gap: 8px; overflow-x: auto; background: rgba(128, 128, 128, 0.1); border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.05)); max-width: 100%;"
          @wheel.prevent="onCustomWheelScroll"
        >
          <v-chip
            v-for="(liturgy, index) in customLiturgies"
            :key="index"
            :color="selectedCustomIndex === index ? 'primary' : 'default'"
            :variant="selectedCustomIndex === index ? 'flat' : 'elevated'"
            class="font-weight-medium text-none pr-2 flex-shrink-0"
            style="box-shadow: 0 2px 5px rgba(0,0,0,0.05);"
            @click="selectedCustomIndex = index; selectedItemIndex = null"
          >
            {{ liturgy.name }}
            <v-icon
              icon="mdi-close-circle"
              size="18"
              class="ml-2"
              style="opacity: 0.6; cursor: pointer;"
              @click.stop="removeCustomLiturgy(index)"
            />
          </v-chip>
          <v-btn
            variant="tonal"
            color="primary"
            size="small"
            rounded="lg"
            class="text-none font-weight-bold ml-2 flex-shrink-0"
            prepend-icon="mdi-plus"
            @click="showNewCustomDialog = true"
          >
            {{ t('custom_liturgy.new') }}
          </v-btn>
        </div>
      </v-expand-transition>

      <!-- Main Content Area -->
      <div class="content-main d-flex" style="flex-direction: row !important; overflow: hidden; flex-grow: 1; min-height: 0; padding: 24px; gap: 24px;">
        <!-- Left Panel: Liturgy List -->
        <div class="d-flex flex-column flex-grow-1" style="min-width: 0; min-height: 0; background: var(--main-bg, transparent); border-radius: 20px;">
          <!-- List Header -->
          <div class="px-6 py-4 d-flex align-center justify-space-between">
            <h3 style="font-size: 1.25rem; color: var(--sidebar-text); font-weight: 700;">
              {{ currentLiturgyTitle }}
            </h3>
            <div class="d-flex" style="gap: 12px;">
              <v-btn
                v-if="currentItems.length > 0"
                variant="tonal"
                color="error"
                rounded="lg"
                class="text-none font-weight-bold px-4"
                @click="confirmClearAll"
              >
                {{ t('actions.clear_all') }}
              </v-btn>
              <v-btn
                variant="flat"
                color="primary"
                rounded="lg"
                class="text-none font-weight-bold px-5"
                prepend-icon="mdi-plus"
                @click="openAddMenu()"
              >
                {{ t('add_item') }}
              </v-btn>
            </div>
          </div>

          <!-- Drag & Drop List -->
          <div class="flex-grow-1 px-2 py-2" style="overflow-y: auto; min-height: 0;">
            <div v-if="currentItems.length === 0" class="d-flex flex-column align-center justify-center h-100 opacity-50 py-8">
              <v-icon size="56" class="mb-3">
                mdi-playlist-plus
              </v-icon>
              <div class="text-body-1 font-weight-medium mb-1">
                {{ t('empty_list') }}
              </div>
              <div class="text-body-2" style="max-width: 260px; text-align: center;">
                {{ t('empty_list_hint') }}
              </div>
            </div>

            <draggable
              v-else
              v-model="currentItems"
              item-key="id"
              handle=".drag-handle"
              ghost-class="liturgy-ghost"
              animation="200"
              @start="startItemDrag"
              @end="finishItemDrag"
            >
              <template #item="{ element, index }">
                <div
                  v-if="element.type === 'category'"
                  class="liturgy-category-item"
                  :class="{ 'liturgy-item-active': selectedItemIndex === index }"
                  @click="toggleCategory(element)"
                >
                  <v-icon class="drag-handle mr-2" size="18" style="cursor: grab; opacity: 0.3;">
                    mdi-drag-vertical
                  </v-icon>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    :aria-label="t(element.collapsed ? 'actions.expand_category' : 'actions.collapse_category')"
                    :aria-expanded="!element.collapsed"
                    @click.stop="toggleCategory(element)"
                  >
                    <v-icon size="18">
                      {{ element.collapsed ? 'mdi-chevron-right' : 'mdi-chevron-down' }}
                    </v-icon>
                  </v-btn>
                  <span class="font-weight-black text-uppercase" style="font-size: 0.85rem; letter-spacing: 1px; color: var(--sidebar-text);">
                    {{ element.name }}
                  </span>
                  <span class="text-caption ml-2" style="color: var(--sidebar-text-secondary);">{{ categoryItemCount(index) }}</span>
                  <v-spacer />
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    :aria-label="t('actions.add_subitem')"
                    @click.stop="openAddMenu(element.id)"
                  >
                    <v-icon size="16">
                      mdi-plus
                    </v-icon>
                    <v-tooltip activator="parent" location="top">
                      {{ t('actions.add_subitem') }}
                    </v-tooltip>
                  </v-btn>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    @click.stop="editItem(index)"
                  >
                    <v-icon size="16">
                      mdi-pencil
                    </v-icon>
                    <v-tooltip
                      activator="parent"
                      location="top"
                      open-delay="300"
                      content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                    >
                      {{ t('actions.edit') }}
                    </v-tooltip>
                  </v-btn>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    color="error"
                    @click.stop="removeItem(index)"
                  >
                    <v-icon size="16">
                      mdi-close
                    </v-icon>
                    <v-tooltip
                      activator="parent"
                      location="top"
                      open-delay="300"
                      content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                    >
                      {{ t('actions.delete') }}
                    </v-tooltip>
                  </v-btn>
                </div>

                <div
                  v-else
                  v-show="!itemCategory(index)?.collapsed"
                  class="liturgy-item"
                  :class="{ 'liturgy-item-active': selectedItemIndex === index, 'liturgy-subitem': !!itemCategory(index) }"
                  @click="selectItem(index)"
                >
                  <v-icon class="drag-handle mr-3" size="18" style="cursor: grab; opacity: 0.3;">
                    mdi-drag-vertical
                  </v-icon>
                  <div class="liturgy-item-number">
                    {{ getItemNumber(index) }}
                  </div>
                  <v-btn
                    icon
                    size="x-small"
                    variant="text"
                    :color="element.done ? 'success' : 'grey'"
                    class="mr-2"
                    @click.stop="toggleItemDone(index)"
                  >
                    <v-icon size="22">
                      {{ element.done ? 'mdi-check-circle' : 'mdi-checkbox-blank-circle-outline' }}
                    </v-icon>
                  </v-btn>
                  <v-icon
                    :color="getTypeColor(element.type)"
                    size="20"
                    class="mr-3"
                    :style="element.done ? 'opacity: 0.5;' : ''"
                  >
                    {{ getTypeIcon(element.type) }}
                  </v-icon>
                  <div class="flex-grow-1 d-flex flex-column" style="min-width: 0;" :style="element.done ? 'opacity: 0.5; text-decoration: line-through;' : ''">
                    <div class="font-weight-bold" style="font-size: 0.95rem; color: var(--sidebar-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ itemDisplayName(element) }}
                    </div>
                    <div v-if="element.subtitle" class="text-caption" style="color: var(--sidebar-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      {{ element.subtitle }}
                    </div>
                  </div>
                  <div class="d-flex align-center" style="gap: 2px; flex-shrink: 0;">
                    <v-btn
                      v-if="isExecutable(element)"
                      icon
                      size="x-small"
                      variant="text"
                      color="primary"
                      @click.stop="executeItem(element)"
                    >
                      <v-icon size="16">
                        {{ getExecuteIcon(element.type) }}
                      </v-icon>
                      <v-tooltip
                        activator="parent"
                        location="top"
                        open-delay="300"
                        content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                      >
                        {{ getExecuteTooltip(element.type) }}
                      </v-tooltip>
                    </v-btn>
                    <template v-if="element.type === 'music' && element.musicId">
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="primary"
                        :disabled="!musicHasPlayback(element)"
                        @click.stop="executeItem(element, 'instrumental')"
                      >
                        <v-icon size="16">
                          mdi-play-circle-outline
                        </v-icon>
                        <v-tooltip
                          activator="parent"
                          location="top"
                          open-delay="300"
                          content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                        >
                          Playback
                        </v-tooltip>
                      </v-btn>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="primary"
                        :disabled="!musicHasAudio(element) && !musicHasPlayback(element)"
                        :aria-label="t('actions.audio_only')"
                        @click.stop="executeItem(element, 'audio_only')"
                      >
                        <v-icon size="16">
                          mdi-headphones
                        </v-icon>
                        <v-tooltip
                          activator="parent"
                          location="top"
                          open-delay="300"
                          content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                        >
                          {{ t('actions.audio_only') }}
                        </v-tooltip>
                      </v-btn>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="primary"
                        :disabled="!musicHasPlayback(element)"
                        :aria-label="t('actions.audio_only_playback')"
                        @click.stop="executeItem(element, 'audio_only_playback')"
                      >
                        <v-icon size="16">
                          mdi-headphones-settings
                        </v-icon>
                        <v-tooltip
                          activator="parent"
                          location="top"
                          open-delay="300"
                          content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                        >
                          {{ t('actions.audio_only_playback') }}
                        </v-tooltip>
                      </v-btn>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="primary"
                        @click.stop="executeItem(element, 'no_audio')"
                      >
                        <v-icon size="16">
                          mdi-monitor
                        </v-icon>
                        <v-tooltip
                          activator="parent"
                          location="top"
                          open-delay="300"
                          content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                        >
                          Sem Áudio
                        </v-tooltip>
                      </v-btn>
                      <v-btn
                        icon
                        size="x-small"
                        variant="text"
                        color="primary"
                        @click.stop="openMusicLyric(element)"
                      >
                        <v-icon size="16">
                          mdi-text-box-outline
                        </v-icon>
                        <v-tooltip
                          activator="parent"
                          location="top"
                          open-delay="300"
                          content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                        >
                          Letra
                        </v-tooltip>
                      </v-btn>
                    </template>
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      @click.stop="editItem(index)"
                    >
                      <v-icon size="16">
                        mdi-pencil
                      </v-icon>
                      <v-tooltip
                        activator="parent"
                        location="top"
                        open-delay="300"
                        content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                      >
                        {{ t('actions.edit') }}
                      </v-tooltip>
                    </v-btn>
                    <v-btn
                      icon
                      size="x-small"
                      variant="text"
                      color="error"
                      @click.stop="removeItem(index)"
                    >
                      <v-icon size="16">
                        mdi-close
                      </v-icon>
                      <v-tooltip
                        activator="parent"
                        location="top"
                        open-delay="300"
                        content-class="modern-glass-menu elevation-0 font-weight-medium text-white"
                      >
                        {{ t('actions.delete') }}
                      </v-tooltip>
                    </v-btn>
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </div>

        <!-- Right Panel: Sidebar (Notes Only) -->
        <div v-if="!isCompactView" class="d-flex flex-column flex-shrink-0" style="flex: 0 0 380px; width: 380px; min-height: 0; background: var(--card-bg, #fff); border-radius: 20px; border: 1px solid var(--border-color, rgba(0,0,0,0.05)); box-shadow: 0 8px 30px rgba(0,0,0,0.04); overflow: hidden;">
          <div class="pa-4 pb-3 d-flex align-center justify-space-between" style="border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.05)); background: rgba(var(--v-theme-surface), 0.3);">
            <h3 style="font-size: 1.15rem; color: var(--sidebar-text); font-weight: 700;">
              <v-icon size="20" class="mr-2 mb-1" color="primary">
                mdi-note-edit-outline
              </v-icon>
              {{ t('notes') }}
            </h3>
          </div>
          <div class="flex-grow-1" style="overflow-y: hidden;">
            <RichTextEditor
              v-model="currentNotes"
              placeholder="Escreva suas anotações para este culto aqui..."
              @blur="saveLiturgy"
            />
          </div>
        </div>
      </div>


      <!-- ====== ADD ITEM DIALOG (Multi-step) ====== -->
      <v-dialog
        v-model="showAddMenu"
        max-width="520"
        :theme="$theme.primary()"
        content-class="modern-alert-dialog-wrapper"
        @update:model-value="val => { if (!val) addStep = 1; }"
      >
        <v-card class="modern-alert-card rounded-xl">
          <v-window v-model="addStep">
            <!-- Step 1: Type Selection -->
            <v-window-item :value="1">
              <v-card-title class="pt-6 px-6 pb-2 d-flex align-center justify-space-between">
                <span class="font-weight-bold" style="font-size: 1.2rem; color: var(--sidebar-text);">{{ t('add_item') }}</span>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  @click="showAddMenu = false"
                >
                  <v-icon>mdi-close</v-icon>
                </v-btn>
              </v-card-title>
              <v-card-text class="px-6 pb-6 pt-2">
                <div
                  v-for="type in itemTypes"
                  :key="type.value"
                  class="d-flex align-center rounded-xl pa-4 mb-3"
                  style="cursor: pointer; transition: all 0.2s ease; border: 1px solid var(--border-color, rgba(255,255,255,0.05)); background: rgba(var(--v-theme-surface), 0.1);"
                  onmouseover="this.style.background='rgba(var(--v-theme-surface), 0.25)'"
                  onmouseout="this.style.background='rgba(var(--v-theme-surface), 0.1)'"
                  @click="openAddForm(type.value)"
                >
                  <div class="d-flex align-center justify-center mr-4" style="width: 32px;">
                    <v-icon :color="type.color" size="28">
                      {{ type.icon }}
                    </v-icon>
                  </div>
                  <div class="flex-grow-1">
                    <div class="font-weight-bold mb-1" style="font-size: 1.05rem; color: var(--sidebar-text);">
                      {{ type.label }}
                    </div>
                    <div style="font-size: 0.85rem; color: var(--sidebar-text-secondary); line-height: 1.2;">
                      {{ type.description }}
                    </div>
                  </div>
                  <v-icon color="grey" size="24" class="opacity-50">
                    mdi-chevron-right
                  </v-icon>
                </div>
              </v-card-text>
            </v-window-item>

            <!-- Step 2: Form -->
            <v-window-item :value="2">
              <v-card-title class="pt-6 px-6 d-flex align-center">
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  class="mr-3"
                  style="margin-left: -8px;"
                  @click="addStep = 1"
                >
                  <v-icon>mdi-arrow-left</v-icon>
                </v-btn>
                <v-icon :color="getTypeColor(addForm.type)" class="mr-3">
                  {{ getTypeIcon(addForm.type) }}
                </v-icon>
                <span class="font-weight-bold" style="font-size: 1.2rem; color: var(--sidebar-text);">{{ t('add_item') }}: {{ getTypeLabel(addForm.type) }}</span>
              </v-card-title>

              <v-card-text class="px-6 pb-2 pt-4">
                <!-- Name -->
                <v-text-field
                  v-if="addForm.type !== 'scheduled_item'" v-model="addForm.name"
                  :label="t('fields.name')"
                  variant="outlined"
                  rounded="lg"
                  density="comfortable"
                  hide-details
                  class="modern-input-no-thick mb-4"
                  :placeholder="getNamePlaceholder(addForm.type)"
                  autofocus
                />

                <v-select
                  v-if="addForm.type !== 'category'"
                  v-model="addForm.categoryId"
                  :items="categoryOptions"
                  :label="t('fields.category')"
                  variant="outlined"
                  rounded="lg"
                  density="comfortable"
                  hide-details
                  class="modern-input-no-thick mb-4"
                />

                <div v-if="addForm.type === 'scheduled_item'" class="mb-4">
                  <v-select v-model="addForm.scheduledCategoryId" :items="scheduledCategories" item-title="name" item-value="id" label="Categoria agendada" variant="outlined" rounded="lg" />
                  <v-alert v-if="!scheduledCategories.length" type="info" variant="tonal" class="mb-3">
                    Crie uma categoria em Itens Agendados para incluí-la na programação.
                  </v-alert>
                  <v-btn variant="tonal" @click="showScheduledManager = true">
                    Gerenciar Itens Agendados
                  </v-btn>
                </div>
                <!-- Description (annotation only) -->
                <v-textarea
                  v-if="addForm.type === 'annotation'"
                  v-model="addForm.subtitle"
                  :label="t('fields.description')"
                  variant="outlined"
                  rounded="lg"
                  density="comfortable"
                  hide-details
                  rows="2"
                  auto-grow
                  class="modern-input-no-thick mb-4"
                />

                <!-- Music selector -->
                <div v-if="addForm.type === 'music'" class="mb-4">
                  <v-autocomplete
                    v-model="addForm.musicId"
                    v-model:search="musicSearchQuery"
                    :items="filteredMusicList"
                    :custom-filter="() => true"
                    item-title="name"
                    item-value="id_music"
                    :label="t('fields.search_music')"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    class="modern-input-no-thick"
                    hide-details
                    clearable
                    :menu-props="{ transition: 'fade-transition' }"
                    :list-props="{ style: 'background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color, rgba(150, 150, 150, 0.2)); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); padding: 8px 0;' }"
                    @update:model-value="onMusicSelect"
                  >
                    <template #item="{ item, props }">
                      <v-list-item
                        v-bind="props"
                        :title="null"
                        class="mx-2 rounded-lg mb-1"
                        color="primary"
                        style="min-height: 40px;"
                      >
                        <template v-if="item.raw.hymnal_track" #prepend>
                          <span class="mr-3 font-weight-bold" style="color: var(--accent-blue); min-width: 32px; font-size: 0.85rem;">{{ item.raw.hymnal_track }}</span>
                        </template>
                        <template #title>
                          <div class="d-flex flex-column justify-center" style="min-height: 38px;">
                            <span class="text-body-2 font-weight-medium" :class="item.value === addForm.musicId ? '' : 'opacity-70'">
                              {{ item.title }}
                            </span>
                            <span v-if="item.raw.album_names" class="text-caption" style="color: var(--sidebar-text-secondary); opacity: 0.8; font-size: 0.7rem !important; line-height: 1.2; margin-top: 2px;">{{ item.raw.album_names }}</span>
                          </div>
                        </template>
                      </v-list-item>
                    </template>
                    <template #no-data>
                      <v-list-item>
                        <v-list-item-title class="text-caption text-center pt-2 pb-2" style="color: var(--sidebar-text-secondary);">
                          Música não encontrada
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                  <v-btn
                    v-if="!addForm.musicId"
                    variant="text"
                    size="small"
                    class="text-none font-weight-regular mt-2 px-2"
                    style="color: var(--sidebar-text-secondary);"
                    @click="chooseMusicLater"
                  >
                    {{ t('actions.choose_later') }}
                  </v-btn>
                </div>

                <!-- Verse selector -->
                <div v-if="addForm.type === 'verse'">
                  <v-autocomplete
                    v-model="addForm.verseBookId"
                    :items="bibleBooks"
                    item-title="name"
                    item-value="id_bible_book"
                    :label="t('fields.book')"
                    variant="outlined"
                    rounded="lg"
                    density="comfortable"
                    class="modern-input-no-thick mb-3"
                    hide-details
                    :menu-props="{ transition: 'fade-transition' }"
                    :list-props="{ style: 'background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color, rgba(150, 150, 150, 0.2)); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); padding: 8px 0;' }"
                    @update:model-value="onBookSelect"
                  >
                    <template #item="{ item, props }">
                      <v-list-item
                        v-bind="props"
                        :title="null"
                        class="mx-2 rounded-lg mb-1"
                        color="primary"
                        style="min-height: 40px;"
                      >
                        <template #title>
                          <div class="d-flex align-center">
                            <span class="text-body-2 font-weight-medium" :class="item.value === addForm.verseBookId ? '' : 'opacity-70'">
                              {{ item.title }}
                            </span>
                          </div>
                        </template>
                      </v-list-item>
                    </template>
                    <template #no-data>
                      <v-list-item>
                        <v-list-item-title class="text-caption text-center pt-2 pb-2" style="color: var(--sidebar-text-secondary);">
                          Livro não encontrado
                        </v-list-item-title>
                      </v-list-item>
                    </template>
                  </v-autocomplete>
                  <div class="d-flex" style="gap: 12px;">
                    <v-autocomplete
                      v-model="addForm.verseChapter"
                      :items="verseChapterList"
                      :label="t('fields.chapter')"
                      variant="outlined"
                      rounded="lg"
                      density="comfortable"
                      class="modern-input-no-thick mb-3"
                      hide-details
                      style="max-width: 120px;"
                      :menu-props="{ transition: 'fade-transition' }"
                      :list-props="{ style: 'background: var(--card-bg); border-radius: 12px; border: 1px solid var(--border-color, rgba(150, 150, 150, 0.2)); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3); padding: 8px 0;' }"
                    >
                      <template #item="{ item, props }">
                        <v-list-item
                          v-bind="props"
                          :title="null"
                          class="mx-2 rounded-lg mb-1"
                          color="primary"
                          style="min-height: 40px;"
                        >
                          <template #title>
                            <div class="d-flex align-center">
                              <span class="text-body-2 font-weight-medium" :class="item.value === addForm.verseChapter ? '' : 'opacity-70'">
                                {{ item.title }}
                              </span>
                            </div>
                          </template>
                        </v-list-item>
                      </template>
                      <template #no-data>
                        <v-list-item>
                          <v-list-item-title class="text-caption text-center pt-2 pb-2" style="color: var(--sidebar-text-secondary);">
                            {{ addForm.verseBookId ? 'Capítulo não encontrado' : 'Selecione o livro primeiro' }}
                          </v-list-item-title>
                        </v-list-item>
                      </template>
                    </v-autocomplete>
                    <v-text-field
                      v-model="addForm.verseNumbers"
                      :label="t('fields.verses')"
                      variant="outlined"
                      rounded="lg"
                      density="comfortable"
                      class="modern-input-no-thick mb-3"
                      hide-details
                      placeholder="Ex: 1-5, 8"
                    />
                  </div>
                </div>

                <!-- Media file selector -->
                <div v-if="addForm.type === 'media'" class="mb-4">
                  <v-btn
                    block
                    variant="tonal"
                    color="primary"
                    rounded="lg"
                    class="text-none font-weight-bold"
                    prepend-icon="mdi-folder-open"
                    @click="selectMediaFile"
                  >
                    {{ addForm.filePath ? 'Trocar Arquivo' : t('fields.select_file') }}
                  </v-btn>
                  <v-btn
                    v-if="!addForm.filePath"
                    variant="text"
                    size="small"
                    class="text-none font-weight-regular mt-2 px-2"
                    style="color: var(--sidebar-text-secondary);"
                    @click="chooseMediaLater"
                  >
                    {{ t('actions.choose_later') }}
                  </v-btn>
                  <div v-if="addForm.filePath" class="text-caption mt-2" style="color: var(--sidebar-text-secondary); word-break: break-all;">
                    {{ addForm.filePath }}
                  </div>
                </div>

                <!-- Presentation file selector -->
                <div v-if="addForm.type === 'presentation'" class="mb-4">
                  <v-btn
                    block
                    variant="tonal"
                    color="primary"
                    rounded="lg"
                    class="text-none font-weight-bold"
                    prepend-icon="mdi-folder-open"
                    @click="selectPresentationFile"
                  >
                    {{ addForm.filePath ? 'Trocar Arquivo' : t('fields.select_file') }}
                  </v-btn>
                  <div v-if="addForm.filePath" class="text-caption mt-2" style="color: var(--sidebar-text-secondary); word-break: break-all;">
                    {{ addForm.filePath }}
                  </div>
                </div>
                <!-- Link URL -->
                <v-text-field
                  v-if="addForm.type === 'link'"
                  v-model="addForm.url"
                  :label="t('fields.url')"
                  variant="outlined"
                  rounded="lg"
                  density="comfortable"
                  class="modern-input-no-thick mb-4"
                  hide-details
                  placeholder="https://..."
                />

                <v-select
                  v-if="supportsAutomationTrigger(addForm.type)"
                  v-model="addForm.automationTriggerId"
                  :items="automationTriggerOptions"
                  label="Gatilho de automação"
                  variant="outlined"
                  rounded="lg"
                  density="comfortable"
                  hide-details
                  clearable
                  class="modern-input-no-thick mb-4"
                  prepend-inner-icon="mdi-lightning-bolt"
                />
              </v-card-text>

              <v-card-actions class="px-6 pb-6 pt-2 d-flex justify-end" style="gap: 12px;">
                <v-spacer />
                <v-btn
                  color="error"
                  variant="tonal"
                  class="modern-alert-btn px-6"
                  height="40"
                  @click="showAddMenu = false"
                >
                  {{ t('actions.cancel') }}
                </v-btn>
                <v-btn
                  color="primary"
                  variant="flat"
                  class="modern-alert-btn px-6"
                  height="40"
                  :disabled="!isFormValid"
                  @click="saveItem"
                >
                  {{ t('actions.save') }}
                </v-btn>
              </v-card-actions>
            </v-window-item>
          </v-window>
        </v-card>
      </v-dialog>

      <v-dialog v-model="showScheduledManager" :theme="$theme.primary()" max-width="1060" :z-index="10010" content-class="scheduled-dialog-wrapper" scrollable>
        <v-card class="modern-alert-card rounded-xl scheduled-manager">
          <div class="scheduled-header">
            <div class="scheduled-icon"><v-icon size="26">mdi-calendar-clock</v-icon></div>
            <div class="flex-grow-1">
              <h2>Itens Agendados</h2>
              <p>Um lugar na programação. O arquivo certo a cada dia.</p>
            </div>
            <v-btn icon="mdi-close" size="small" variant="text" aria-label="Fechar" @click="showScheduledManager = false" />
          </div>
          <v-card-text class="pa-0 scheduled-body">
            <aside class="scheduled-sidebar">
              <div class="scheduled-section-label">CATEGORIAS <span>{{ scheduledCategories.length }}</span></div>
              <div class="scheduled-category-list">
                <button v-for="category in scheduledCategories" :key="category.id" type="button" class="scheduled-category" :class="{ 'is-selected': selectedScheduledCategoryId === category.id }" :aria-pressed="selectedScheduledCategoryId === category.id" @click="selectScheduledCategory(category.id)">
                  <v-icon size="20">mdi-folder-outline</v-icon>
                  <span class="scheduled-category-name">{{ category.name }}<small>{{ category.items.length }} {{ category.items.length === 1 ? 'arquivo' : 'arquivos' }}</small></span>
                  <v-icon v-if="selectedScheduledCategoryId === category.id" size="16">mdi-chevron-right</v-icon>
                </button>
                <p v-if="!scheduledCategories.length" class="scheduled-muted text-body-2">Crie sua primeira categoria para começar.</p>
              </div>
              <form class="scheduled-create" @submit.prevent="createScheduledCategory">
                <v-text-field v-model="newScheduledCategoryName" placeholder="Nome da categoria" aria-label="Nome da nova categoria" variant="outlined" rounded="lg" density="compact" hide-details class="modern-input-no-thick" />
                <v-btn type="submit" block variant="tonal" color="primary" prepend-icon="mdi-plus" rounded="lg" :disabled="!newScheduledCategoryName.trim()">Criar categoria</v-btn>
              </form>
              <div class="scheduled-sidebar-tip"><v-icon size="18">mdi-lightbulb-outline</v-icon><span>Use nomes como Provai e Vede ou Informativo Mundial.</span></div>
            </aside>
            <main class="scheduled-content">
              <template v-if="selectedScheduledCategory">
                <div class="d-flex align-center ga-3 mb-5">
                  <div class="flex-grow-1" style="min-width: 0;"><h3 class="scheduled-category-heading">{{ selectedScheduledCategory.name }}</h3><p class="scheduled-muted text-body-2">Associe um arquivo a cada data de apresentação.</p></div>
                  <v-menu location="bottom end">
                    <template #activator="{ props }"><v-btn v-bind="props" icon="mdi-dots-horizontal" variant="text" size="small" aria-label="Opções da categoria" /></template>
                    <v-list rounded="lg" density="compact"><v-list-item prepend-icon="mdi-delete-outline" title="Excluir categoria" base-color="error" @click="deleteScheduledCategory" /></v-list>
                  </v-menu>
                </div>
                <section class="scheduled-composer">
                  <div class="scheduled-section-label mb-3">NOVO AGENDAMENTO</div>
                  <button type="button" class="scheduled-file-picker" :class="{ 'has-file': scheduledFilePath }" @click="selectScheduledFile">
                    <div class="scheduled-file-icon"><v-icon size="26">{{ scheduledFilePath ? 'mdi-file-check-outline' : 'mdi-folder-open-outline' }}</v-icon></div>
                    <span class="scheduled-file-copy"><strong>{{ scheduledFilePath ? scheduledFilePath.split(/[\\/]/).pop() : 'Escolher arquivo' }}</strong><small>{{ scheduledFilePath || 'Vídeo, áudio ou documento do seu computador' }}</small></span>
                    <v-icon size="20">{{ scheduledFilePath ? 'mdi-swap-horizontal' : 'mdi-plus' }}</v-icon>
                  </button>
                  <div class="scheduled-date-row">
                    <v-text-field v-model="scheduledDate" type="date" label="Data da apresentação" variant="outlined" rounded="lg" density="comfortable" hide-details class="modern-input-no-thick scheduled-date-input" />
                    <div class="scheduled-shortcuts"><v-btn variant="text" size="small" rounded="lg" @click="setScheduledDay('today')">Hoje</v-btn><v-btn variant="text" size="small" rounded="lg" @click="setScheduledDay('saturday')">Próximo sábado</v-btn></div>
                    <v-btn color="primary" variant="flat" rounded="lg" height="44" prepend-icon="mdi-calendar-plus" :disabled="!scheduledDate || !scheduledFilePath || scheduledDateConflict" @click="addScheduledFile">Agendar</v-btn>
                  </div>
                  <p v-if="scheduledDateConflict" class="text-error text-caption mt-3" role="alert">Esta data já tem um arquivo. Escolha outra data ou remova o agendamento existente.</p>
                  <p v-else class="scheduled-muted text-caption mt-3">A reprodução acontece quando você aciona o item na programação.</p>
                </section>
                <div class="scheduled-section-label mt-6 mb-3">ARQUIVOS AGENDADOS <span>{{ sortedScheduledItems.length }}</span></div>
                <div v-if="!sortedScheduledItems.length" class="scheduled-empty">
                  <v-icon size="34" class="mb-3">mdi-calendar-blank-outline</v-icon>
                  <strong>Seu primeiro agendamento começa aqui</strong>
                  <p>Escolha um arquivo acima, defina a data e clique em Agendar.</p>
                </div>
                <div v-else class="scheduled-entries">
                  <article v-for="entry in sortedScheduledItems" :key="entry.id" class="scheduled-entry">
                    <div class="scheduled-date-badge"><strong>{{ entry.date.slice(8) }}</strong><span>{{ scheduledMonth(entry.date) }}</span></div>
                    <div class="scheduled-entry-copy"><strong>{{ entry.name }}</strong><span :title="entry.filePath">{{ entry.filePath }}</span></div>
                    <v-text-field :model-value="entry.date" type="date" aria-label="Alterar data do agendamento" variant="outlined" rounded="lg" density="compact" hide-details class="modern-input-no-thick scheduled-entry-date" @change="changeScheduledDate(entry, $event)" />
                    <v-btn icon="mdi-close" variant="text" size="x-small" aria-label="Remover agendamento" @click="removeScheduledFile(entry.id)" />
                  </article>
                </div>
              </template>
              <div v-else class="scheduled-empty scheduled-welcome">
                <div class="scheduled-icon mb-4"><v-icon size="30">mdi-calendar-multiple</v-icon></div>
                <h3>Organize hoje. Apresente no dia certo.</h3>
                <p>Crie uma categoria ao lado, agende seus arquivos e adicione essa categoria uma única vez à programação.</p>
              </div>
            </main>
          </v-card-text>
          <div class="scheduled-footer"><v-icon size="16">mdi-check-circle-outline</v-icon> Agendamentos salvos automaticamente</div>
        </v-card>
      </v-dialog>
      <!-- ====== NEW CUSTOM LITURGY DIALOG ====== -->
      <v-dialog
        v-model="showNewCustomDialog"
        max-width="420"
        :theme="$theme.primary()"
        content-class="modern-alert-dialog-wrapper"
      >
        <v-card class="modern-alert-card rounded-xl">
          <v-card-title class="pt-6 px-6">
            {{ t('custom_liturgy.new') }}
          </v-card-title>
          <v-card-text class="px-6 pb-2 pt-4">
            <v-text-field
              v-model="newCustomName"
              :placeholder="t('custom_liturgy.name_placeholder')"
              variant="outlined"
              rounded="lg"
              density="comfortable"
              class="modern-input-no-thick"
              hide-details
              autofocus
              @keydown.enter="createCustomLiturgy"
            />
          </v-card-text>
          <v-card-actions class="px-6 pb-6 pt-2 d-flex justify-end" style="gap: 12px;">
            <v-spacer />
            <v-btn
              color="error"
              variant="tonal"
              class="modern-alert-btn px-6"
              height="40"
              @click="showNewCustomDialog = false"
            >
              {{ t('actions.cancel') }}
            </v-btn>
            <v-btn
              color="primary"
              variant="flat"
              class="modern-alert-btn px-6"
              height="40"
              :disabled="!newCustomName.trim()"
              @click="createCustomLiturgy"
            >
              {{ t('actions.save') }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </div>
  </v-slide-y-reverse-transition>
</template>

<script lang="ts">
import files from "@/helpers/BrowserFiles";
import { matchesPrimaryHymnal, getHymnalSearchPriority, getPreferredHymnalAlbum } from "@/helpers/HymnalPreference";
import manifest from "../manifest.json";
import MenuToggleButton from "@/components/MenuToggleButton.vue";
import draggable from "vuedraggable";
import RichTextEditor from "./RichTextEditor.vue";
import { isAudioFile, isWebUrl, openExternalMedia } from "@/helpers/ExternalMedia";
import { isYouTubeUrl } from "@/helpers/YouTube";
import { transitionProjection } from "@/helpers/ProjectionTransition";
import { categoryForIndex, categoryEnd, insertInCategory, keepCategoryTogether } from "@/helpers/LiturgyGroups";

export default {
  name: "LiturgyModuleIndex",
  components: {
    MenuToggleButton,
    draggable,
    RichTextEditor,
  },
  data: () => ({
    showScheduledManager: false,
    scheduledCategories: [],
    selectedScheduledCategoryId: null,
    newScheduledCategoryName: "",
    scheduledDate: "",
    scheduledFilePath: "",
    isCompactView: false,
    selectedDay: null,
    selectedItemIndex: null,
    liturgyTransitionInProgress: false,
    liturgyExecution: null,
    liturgyExternalTargetVolume: 100,
    selectedCustomIndex: 0,

    // Liturgies storage: { sunday: [...], monday: [...], ... }
    liturgies: {
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    },
    dayNotes: {
      sunday: "",
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
    },
    customLiturgies: [], // [{ name: "...", items: [...], notes: "" }]

    // Add item popup
    showAddMenu: false,
    addStep: 1,
    editingIndex: null,
    addCategoryId: null,
    dragItemsBefore: [],
    dragSelectedId: null,
    addForm: {
      scheduledCategoryId: null,
      categoryId: null,
      type: "annotation",
      name: "",
      subtitle: "",
      musicId: null,
      musicMode: "audio",
      verseBookId: null,
      verseChapter: null,
      verseNumbers: "",
      filePath: "",
      url: "",
      automationTriggerId: null,
    },

    // Custom liturgy dialog
    showNewCustomDialog: false,
    newCustomName: "",

    // Data for selectors
    musicSearchQuery: "",
    musicList: [],
    bibleBooks: [],
    bibleVersions: [],
  }),
  computed: {
    scheduledDateConflict() {
      return Boolean(this.selectedScheduledCategory?.items.some(entry => entry.date === this.scheduledDate));
    },
    selectedScheduledCategory() { return this.scheduledCategories.find(category => category.id === this.selectedScheduledCategoryId); },
    sortedScheduledItems() { return [...(this.selectedScheduledCategory?.items || [])].sort((a, b) => a.date.localeCompare(b.date)); },
    categoryOptions() {
      return [
        { title: this.t("fields.no_category"), value: null },
        ...this.currentItems.filter(item => item.type === "category").map(item => ({ title: item.name, value: item.id })),
      ];
    },
    filteredMusicList(): Array<Record<string, any>> {
      const selectedMusic = this.musicList.find(m => m.id_music === this.addForm.musicId);
      const query = (this.musicSearchQuery || "").trim().toLowerCase();
      
      if (!query) {
        return selectedMusic ? [selectedMusic] : [];
      }
      
      const isNum = !isNaN(query) && query !== "";
      const numQuery = isNum ? Number(query) : null;
      
      const results = this.musicList.filter(m => {
        if (!matchesPrimaryHymnal(m)) return false;
        const title = (m.name || "").toLowerCase();
        
        if (isNum) {
          const isHymnalTrack = getHymnalSearchPriority(m, numQuery) === 2;
          return title.includes(query) || isHymnalTrack;
        } 
        return title.includes(query);
        
      });
      
      if (isNum) {
        results.sort((a, b) => (
          getHymnalSearchPriority(b, numQuery) - getHymnalSearchPriority(a, numQuery)
        ));
      }
      
      return results.slice(0, 50); // limit to 50 results to keep the menu fast
    },
    module_id() {
      return manifest.id;
    },
    module() {
      return this.$modules.get(this.module_id);
    },
    show() {
      return this.module.show;
    },
    dayOptions() {
      const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      return [
        ...days.map(d => ({ value: d, label: this.t(`days.${d}`) })),
        { value: "custom", label: this.t("days.custom") },
      ];
    },
    currentItems: {
      get() {
        if (this.selectedDay === "custom") {
          const liturgy = this.customLiturgies[this.selectedCustomIndex];
          return liturgy ? liturgy.items : [];
        }
        return this.liturgies[this.selectedDay] || [];
      },
      set(val) {
        if (this.selectedDay === "custom") {
          if (this.customLiturgies[this.selectedCustomIndex]) {
            this.customLiturgies[this.selectedCustomIndex].items = val;
          }
        } else {
          this.liturgies[this.selectedDay] = val;
        }
      },
    },
    currentNotes: {
      get() {
        if (this.selectedDay === "custom") {
          const liturgy = this.customLiturgies[this.selectedCustomIndex];
          return liturgy ? (liturgy.notes || "") : "";
        }
        return this.dayNotes[this.selectedDay] || "";
      },
      set(val) {
        if (this.selectedDay === "custom") {
          if (this.customLiturgies[this.selectedCustomIndex]) {
            this.customLiturgies[this.selectedCustomIndex].notes = val;
          }
        } else {
          this.dayNotes[this.selectedDay] = val;
        }
      },
    },
    currentLiturgyTitle() {
      if (this.selectedDay === "custom") {
        const liturgy = this.customLiturgies[this.selectedCustomIndex];
        return liturgy ? liturgy.name : this.t("custom_liturgy.title");
      }
      return this.t(`days.${this.selectedDay}`);
    },
    selectedItem() {
      if (this.selectedItemIndex === null || this.selectedItemIndex >= this.currentItems.length) return null;
      return this.currentItems[this.selectedItemIndex];
    },
    itemTypes() {
      return [
        { value: "scheduled_item", icon: "mdi-calendar-clock", color: "orange", label: "Item Agendado", description: "Reproduz o arquivo da categoria para a data de hoje." },
        { value: "annotation", icon: "mdi-text", color: "info", label: this.t("types.annotation"), description: this.t("type_descriptions.annotation") },
        { value: "category", icon: "mdi-tag", color: "warning", label: this.t("types.category"), description: this.t("type_descriptions.category") },
        { value: "music", icon: "mdi-music-note", color: "success", label: this.t("types.music"), description: this.t("type_descriptions.music") },
        { value: "verse", icon: "mdi-book-open-variant", color: "purple", label: this.t("types.verse"), description: this.t("type_descriptions.verse") },
        { value: "media", icon: "mdi-file-presentation-box", color: "orange", label: this.t("types.media"), description: this.t("type_descriptions.media") },
        { value: "presentation", icon: "mdi-presentation", color: "indigo", label: this.t("types.presentation"), description: this.t("type_descriptions.presentation") },
        { value: "link", icon: "mdi-link", color: "cyan", label: this.t("types.link"), description: this.t("type_descriptions.link") },
      ];
    },
    automationTriggerOptions() {
      return [
        { title: "Nenhum", value: null },
        ...this.$automation.getTriggerOptions(),
      ];
    },
    isFormValid() {
      if (this.addForm.type === "scheduled_item") return this.scheduledCategories.some(category => category.id === this.addForm.scheduledCategoryId);
      if (!this.addForm.name.trim()) return false;
      if (this.addForm.type === "verse" && (!this.addForm.verseBookId || !this.addForm.verseChapter)) return false;
      if (this.addForm.type === "presentation" && !this.addForm.filePath) return false;
      if (this.addForm.type === "link" && !this.addForm.url.trim()) return false;
      return true;
    },
    verseChapterList() {
      if (!this.addForm.verseBookId) return [];
      const book = this.bibleBooks.find(b => b.id_bible_book === this.addForm.verseBookId);
      if (!book) return [];
      return Array.from({ length: book.chapters }, (_, i) => i + 1);
    },
  },
  watch: {
    show() {
      if (this.show) {
        this.loadData();
        this.$nextTick(() => {
          this.setupResizeObserver();
        });
      } else {
        if (this.resizeObserver) {
          this.resizeObserver.disconnect();
          this.resizeObserver = null;
        }
      }
    },
  },
  async mounted() {
    this.setTodayAsDefault();
    if (this.show) {
      await this.loadData();
      this.setupResizeObserver();
    }
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  },
  methods: {
    supportsAutomationTrigger(type) {
      return ["music", "media", "link", "scheduled_item"].includes(type);
    },

    setupResizeObserver() {
      if (this.$refs.moduleContainer && !this.resizeObserver) {
        this.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            this.isCompactView = entry.contentRect.width < 915;
          }
        });
        this.resizeObserver.observe(this.$refs.moduleContainer);
      }
    },
    t(text) {
      return this.$t(`modules.${this.module_id}.${text}`);
    },
    toggleSidebar() {
      const mainEl = document.querySelector(".main-container");
      if (mainEl) {
        mainEl.dispatchEvent(new CustomEvent("toggle-sidebar"));
      }
    },
    onCustomWheelScroll(e) {
      if (e.deltaY !== 0) {
        e.currentTarget.scrollLeft += e.deltaY;
      }
    },

    // ====== DAY MANAGEMENT ======
    setTodayAsDefault() {
      const dayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      this.selectedDay = dayMap[new Date().getDay()];
    },
    onDayChange() {
      this.selectedItemIndex = null;
    },
    selectDay(day) {
      this.selectedDay = day;
      this.selectedItemIndex = null;
    },
    getLiturgyItems(day) {
      if (day === "custom") {
        return this.customLiturgies.flatMap(l => l.items);
      }
      return this.liturgies[day] || [];
    },

    // ====== IMPORT/EXPORT ======
    getDefaultLiturgies() {
      return {
        sunday: [],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
      };
    },
    getDefaultDayNotes() {
      return {
        sunday: "",
        monday: "",
        tuesday: "",
        wednesday: "",
        thursday: "",
        friday: "",
        saturday: "",
      };
    },
    cloneData(value) {
      return JSON.parse(JSON.stringify(value));
    },
    createExportPayload() {
      return {
        format: "iasdpresenter.liturgy",
        version: 1,
        exportedAt: new Date().toISOString(),
        liturgies: this.cloneData(this.liturgies),
        dayNotes: this.cloneData(this.dayNotes),
        customLiturgies: this.cloneData(this.customLiturgies),
        scheduledCategories: this.cloneData(this.scheduledCategories),
      };
    },
    normalizeImportedLiturgies(data) {
      if (!data || typeof data !== "object") return null;

      const source = data.format === "iasdpresenter.liturgy" ? data : {
        liturgies: data.liturgies,
        dayNotes: data.dayNotes,
        customLiturgies: data.customLiturgies,
        scheduledCategories: data.scheduledCategories,
      };

      const dayKeys = Object.keys(this.getDefaultLiturgies());
      const importedLiturgies = source.liturgies && typeof source.liturgies === "object" ? source.liturgies : {};
      const importedNotes = source.dayNotes && typeof source.dayNotes === "object" ? source.dayNotes : {};
      const liturgies = this.getDefaultLiturgies();
      const dayNotes = this.getDefaultDayNotes();

      dayKeys.forEach(day => {
        if (Array.isArray(importedLiturgies[day])) {
          liturgies[day] = importedLiturgies[day];
        }
        if (typeof importedNotes[day] === "string") {
          dayNotes[day] = importedNotes[day];
        }
      });

      const customLiturgies = Array.isArray(source.customLiturgies)
        ? source.customLiturgies
          .filter(liturgy => liturgy && typeof liturgy === "object")
          .map(liturgy => ({
            name: String(liturgy.name || this.t("custom_liturgy.imported_name")),
            items: Array.isArray(liturgy.items) ? liturgy.items : [],
            notes: typeof liturgy.notes === "string" ? liturgy.notes : "",
          }))
        : [];

      const hasFixedItems = dayKeys.some(day => liturgies[day].length > 0 || dayNotes[day]);
      if (!hasFixedItems && customLiturgies.length === 0) return null;

      const scheduledCategories = Array.isArray(source.scheduledCategories) ? source.scheduledCategories : [];
      const categoryIds = new Set();
      for (const category of scheduledCategories) {
        if (!category || typeof category.id !== "string" || categoryIds.has(category.id) || typeof category.name !== "string" || !Array.isArray(category.items)) return null;
        categoryIds.add(category.id);
        const dates = new Set();
        const ids = new Set();
        for (const entry of category.items) {
          if (!entry || typeof entry.id !== "string" || ids.has(entry.id) || typeof entry.name !== "string" || typeof entry.filePath !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || dates.has(entry.date)) return null;
          dates.add(entry.date); ids.add(entry.id);
        }
      }
      return { liturgies, dayNotes, customLiturgies, scheduledCategories };
    },
    async exportLiturgy() {
      if (!files?.saveFileDialog || !files?.writeTextFile) {
        this.$alert.error({ text: this.t("messages.desktop_only"), translate: false });
        return;
      }

      try {
        const filePath = await files.saveFileDialog({
          title: this.t("actions.export_liturgy"),
          defaultPath: "liturgia-iasdpresenter.json",
          filters: [
            { name: "Liturgia IASDPresenter", extensions: ["json"] },
          ],
        });
        if (!filePath) return;

        const result = await files.writeTextFile(
          filePath,
          `${JSON.stringify(this.createExportPayload(), null, 2)}\n`,
        );
        if (!result?.ok) {
          this.$alert.error({ text: result?.error || this.t("messages.export_error"), translate: false });
          return;
        }

        this.$alert.info({ text: this.t("messages.export_success"), translate: false });
      } catch (error) {
        this.$alert.error({ text: this.t("messages.export_error"), error, translate: false });
      }
    },
    async importLiturgy() {
      if (!files?.openFileDialog || !files?.readTextFile) {
        this.$alert.error({ text: this.t("messages.desktop_only"), translate: false });
        return;
      }

      try {
        const filePath = await files.openFileDialog({
          title: this.t("actions.import_liturgy"),
          filters: [
            { name: "Liturgia IASDPresenter", extensions: ["json"] },
            { name: "Todos", extensions: ["*"] },
          ],
        });
        if (!filePath) return;

        const file = await files.readTextFile(filePath);
        if (!file?.ok) {
          this.$alert.error({ text: file?.error || this.t("messages.import_error"), translate: false });
          return;
        }

        const imported = this.normalizeImportedLiturgies(JSON.parse(file.content));
        if (!imported) {
          this.$alert.error({ text: this.t("messages.import_invalid"), translate: false });
          return;
        }

        this.$alert.yesno(
          { text: this.t("messages.confirm_import"), translate: false },
          (resp) => {
            if (resp !== "yes") return;
            this.liturgies = this.cloneData(imported.liturgies);
            this.dayNotes = this.cloneData(imported.dayNotes);
            this.customLiturgies = this.cloneData(imported.customLiturgies);
            this.scheduledCategories = this.cloneData(imported.scheduledCategories);
            this.selectedScheduledCategoryId = this.scheduledCategories[0]?.id || null;
            this.saveScheduledCategories();
            this.selectedItemIndex = null;
            if (this.selectedDay === "custom" && this.customLiturgies.length === 0) {
              this.setTodayAsDefault();
            }
            this.selectedCustomIndex = Math.min(this.selectedCustomIndex, Math.max(this.customLiturgies.length - 1, 0));
            this.saveLiturgy();
            this.$alert.info({ text: this.t("messages.import_success"), translate: false });
          },
        );
      } catch (error) {
        this.$alert.error({ text: this.t("messages.import_error"), error, translate: false });
      }
    },

    // ====== ITEM TYPE HELPERS ======
    getTypeIcon(type) {
      const map = { scheduled_item: "mdi-calendar-clock", annotation: "mdi-text", category: "mdi-tag", music: "mdi-music-note", verse: "mdi-book-open-variant", media: "mdi-file-presentation-box", presentation: "mdi-presentation", link: "mdi-link" };
      return map[type] || "mdi-help";
    },
    getTypeColor(type) {
      const map = { scheduled_item: "orange", annotation: "info", category: "warning", music: "success", verse: "purple", media: "orange", presentation: "indigo", link: "cyan" };
      return map[type] || "grey";
    },
    getTypeLabel(type) {
      if (type === "scheduled_item") return "Item Agendado";
      return this.t(`types.${type}`);
    },
    getNamePlaceholder(type) {
      const map = {
        annotation: "Ex: Oração, Doxologia, Ofertório...",
        category: "Ex: ABERTURA, ENCERRAMENTO...",
        music: "",
        verse: "",
        media: "Nome do arquivo",
        link: "Nome do link",
        presentation: "Nome da apresentacao",
      };
      return map[type] || "";
    },
    isExecutable(item) {
      if (item.type === "media" && !item.filePath) return false;
      if (item.type === "music" && !item.musicId) return false;
      return ["music", "verse", "link", "media", "presentation", "scheduled_item"].includes(item.type);
    },

    musicHasAudio(item) {
      const music = this.musicList.find(m => m.id_music === item.musicId);
      return Boolean(music?.has_music || music?.url_music);
    },

    musicHasPlayback(item) {
      const music = this.musicList.find(m => m.id_music === item.musicId);
      return Boolean(music?.has_instrumental_music || music?.url_instrumental_music);
    },

    getExecuteIcon(type) {
      if (["media", "scheduled_item"].includes(type)) {
        const useInternal = this.$userdata.get("modules.config.media_use_internal_player");
        if (useInternal) return "mdi-play";
      }
      
      const map = {
        music: "mdi-play",
        verse: "mdi-presentation-play",
        link: "mdi-open-in-new",
        media: "mdi-open-in-new",
        presentation: "mdi-presentation-play",
      };
      return map[type] || "mdi-play";
    },
    getExecuteTooltip(type) {
      if (["media", "scheduled_item"].includes(type)) {
        const useInternal = this.$userdata.get("modules.config.media_use_internal_player");
        if (useInternal) return this.t("actions.play");
      }
      
      const map = {
        music: "actions.play",
        verse: "actions.project",
        link: "actions.open",
        media: "actions.open",
        presentation: "actions.project",
      };
      return this.t(map[type] || "actions.project");
    },

    // ====== ADD/EDIT ITEMS ======
    itemCategory(index) {
      return categoryForIndex(this.currentItems, index);
    },
    categoryItemCount(index) {
      return categoryEnd(this.currentItems, index) - index - 1;
    },
    toggleCategory(category) {
      category.collapsed = !category.collapsed;
      this.saveLiturgy();
    },
    openAddMenu(categoryId = null) {
      this.addCategoryId = categoryId;
      this.editingIndex = null;
      this.addStep = 1;
      this.showAddMenu = true;
    },
    startItemDrag() {
      this.dragItemsBefore = [...this.currentItems];
      this.dragSelectedId = this.selectedItem?.id ?? null;
    },
    finishItemDrag(event) {
      const moved = this.dragItemsBefore[event.oldIndex];
      if (moved) this.currentItems = keepCategoryTogether(this.dragItemsBefore, this.currentItems, moved.id);
      this.restoreSelectedItem(this.dragSelectedId);
      this.dragItemsBefore = [];
      this.saveLiturgy();
    },
    restoreSelectedItem(id) {
      const index = this.currentItems.findIndex(item => item.id === id);
      this.selectedItemIndex = index < 0 ? null : index;
    },
    openAddForm(type) {
      this.editingIndex = null;
      this.addForm = {
        scheduledCategoryId: null,
        categoryId: type === "category" ? null : this.addCategoryId,
        type,
        name: "",
        subtitle: "",
        musicId: null,
        musicMode: "audio",
        verseBookId: null,
        verseChapter: null,
        verseNumbers: "",
        filePath: "",
        url: "",
        automationTriggerId: null,
      };
      this.addStep = 2;
    },
    chooseMusicLater() {
      if (!this.addForm.name.trim()) this.addForm.name = this.t("types.music");
      this.saveItem();
    },
    chooseMediaLater() {
      if (!this.addForm.name.trim()) this.addForm.name = this.t("types.media");
      this.saveItem();
    },
    async saveItem() {
      if (!this.isFormValid) return;

      if (this.addForm.type === "verse" && this.addForm.verseNumbers) {
        try {
          const savedVersion = this.$userdata.get("modules.bible.selected_version");
          let versionId = savedVersion;
          if (!versionId) {
            if (this.bibleVersions.length === 0) {
              const versions = await this.$database.get(`${this.$i18n.locale}_bible_version`);
              if (versions) this.bibleVersions = versions;
            }
            const ara = this.bibleVersions.find(v => v.abbreviation === "ARA" || v.name === "ARA");
            versionId = ara ? ara.id_bible_version : (this.bibleVersions[0]?.id_bible_version || 1);
          }

          const bible_file = `bible_${versionId}_${this.addForm.verseBookId}_${this.addForm.verseChapter}`;
          const versesData = await this.$database.get(bible_file);
          const maxVerse = versesData ? Object.keys(versesData).length : 0;
          
          if (maxVerse > 0) {
            const parts = this.addForm.verseNumbers.split(/[\s,-]+/);
            for (const p of parts) {
              if (!p) continue;
              const num = parseInt(p, 10);
              if (!isNaN(num) && (num < 1 || num > maxVerse)) {
                this.$alert.error({ text: `O capítulo possui apenas ${maxVerse} versículos. O versículo ${num} não existe.`, translate: false });
                return; // halt save!
              }
            }
          }
        } catch (e) {
          console.error("Failed to validate verses", e);
        }
      }

      const item: Record<string, any> & { id: number; type: string } = {
        ...(this.editingIndex !== null ? this.currentItems[this.editingIndex] : {}),
        id: Date.now() + Math.random(),
        type: this.addForm.type,
        name: this.addForm.name.trim(),
        subtitle: this.addForm.subtitle?.trim() || "",
      };

      if (item.type === "scheduled_item") {
        item.categoryId = this.addForm.scheduledCategoryId;
        item.name = this.scheduledCategories.find(category => category.id === item.categoryId).name;
        delete item.filePath;
      }
      delete item.automationTriggerId;
      if (this.supportsAutomationTrigger(this.addForm.type) && this.addForm.automationTriggerId) {
        item.automationTriggerId = this.addForm.automationTriggerId;
      }

      if (this.addForm.type === "music") {
        item.musicId = this.addForm.musicId;
        item.musicMode = this.addForm.musicMode;
        const music = this.musicList.find(m => m.id_music === this.addForm.musicId);
        if (music) {
          item.subtitle = music.album_names || "";
        } else {
          item.subtitle = this.t("messages.music_pending");
        }
      }

      if (this.addForm.type === "verse") {
        item.verseBookId = this.addForm.verseBookId;
        item.verseChapter = this.addForm.verseChapter;
        item.verseNumbers = this.addForm.verseNumbers;
        const book = this.bibleBooks.find(b => b.id_bible_book === this.addForm.verseBookId);
        if (book) {
          item.subtitle = `${book.name} ${this.addForm.verseChapter}${this.addForm.verseNumbers ? `:${  this.addForm.verseNumbers}` : ""}`;
        }
      }

      if (["media", "presentation"].includes(this.addForm.type)) {
        item.filePath = this.addForm.filePath;
        if (item.filePath) {
          const parts = item.filePath.split(/[\\/]/);
          item.subtitle = parts[parts.length - 1];
        } else if (item.type === "media") {
          item.subtitle = this.t("messages.media_pending");
        }
      }

      if (this.addForm.type === "link") {
        item.url = this.addForm.url.trim();
        if (item.url) {
          item.subtitle = item.url;
        }
      }

      const selectedId = this.selectedItem?.id ?? null;
      if (this.editingIndex !== null) {
        const original = this.currentItems[this.editingIndex];
        item.id = original.id;
        const originalCategory = this.itemCategory(this.editingIndex)?.id ?? null;
        if (item.type === "category" || originalCategory === this.addForm.categoryId) {
          this.currentItems.splice(this.editingIndex, 1, item);
        } else {
          this.currentItems.splice(this.editingIndex, 1);
          this.currentItems = insertInCategory(this.currentItems, item, this.addForm.categoryId);
        }
      } else if (item.type === "category") {
        this.currentItems.push(item);
      } else {
        this.currentItems = insertInCategory(this.currentItems, item, this.addForm.categoryId);
      }
      if (item.type !== "category") {
        const category = this.currentItems.find(entry => entry.type === "category" && entry.id === this.addForm.categoryId);
        if (category) category.collapsed = false;
      }
      this.restoreSelectedItem(selectedId);

      this.showAddMenu = false;
      this.addStep = 1;
      this.saveLiturgy();
    },
    removeItem(index) {
      this.$alert.yesno(
        { text: this.t("messages.confirm_delete"), translate: false },
        (resp) => {
          if (resp === "yes") {
            const selectedId = this.selectedItem?.id ?? null;
            const item = this.currentItems[index];
            if (item.type === "category") {
              const children = this.currentItems.splice(index + 1, this.categoryItemCount(index));
              this.currentItems.splice(index, 1);
              const firstCategory = this.currentItems.findIndex(entry => entry.type === "category");
              this.currentItems.splice(firstCategory < 0 ? this.currentItems.length : firstCategory, 0, ...children);
            } else {
              this.currentItems.splice(index, 1);
            }
            this.restoreSelectedItem(selectedId);
            this.saveLiturgy();
          }
        },
      );
    },
    editItem(index) {
      const item = this.currentItems[index];
      this.editingIndex = index;
      this.addForm = {
        scheduledCategoryId: item.categoryId || null,
        categoryId: item.type === "category" ? null : (this.itemCategory(index)?.id ?? null),
        type: item.type,
        name: item.name,
        subtitle: item.subtitle,
        musicId: item.musicId || null,
        musicMode: item.musicMode || "audio",
        verseBookId: item.verseBookId || null,
        verseChapter: item.verseChapter || null,
        verseNumbers: item.verseNumbers || "",
        filePath: item.filePath || "",
        url: item.url || "",
        automationTriggerId: item.automationTriggerId || null,
      };
      this.addStep = 2;
      this.showAddMenu = true;
    },
    toggleItemDone(index) {
      const item = this.currentItems[index];
      item.done = !item.done;
      this.saveLiturgy();
    },
    getItemNumber(index) {
      if (this.currentItems[index].type === "category") return null;
      let count = 0;
      for (let i = 0; i <= index; i++) {
        const item = this.currentItems[i];
        if (item.type === "category") {
          count = 0;
        } else {
          count++;
        }
      }
      return count;
    },
    confirmClearAll() {
      this.$alert.yesno(
        { text: this.t("messages.confirm_clear"), translate: false },
        (resp) => {
          if (resp === "yes") {
            this.currentItems = [];
            this.selectedItemIndex = null;
            this.saveLiturgy();
          }
        },
      );
    },
    async selectItem(index) {
      this.selectedItemIndex = index;
      const item = this.currentItems[index];

      let changed = false;
      if (!item.done) {
        item.done = true;
        changed = true;
      }

      if (this.isExecutable(item)) {
        await this.executeItem(item);
      } else {
        this.runAutomationForItem(item);
      }

      if (changed) {
        this.saveLiturgy();
      }
    },

    // ====== MUSIC SELECTOR ======
    onMusicSelect(musicId) {
      if (!musicId) return;
      const music = this.musicList.find(m => m.id_music === musicId);
      if (music && !this.addForm.name) {
        this.addForm.name = music.hymnal_track ? `${music.hymnal_track} - ${music.name}` : music.name;
      }
    },

    // ====== VERSE SELECTOR ======
    onBookSelect(bookId) {
      if (!bookId) return;
      this.addForm.verseChapter = 1;
      const book = this.bibleBooks.find(b => b.id_bible_book === bookId);
      if (book && !this.addForm.name) {
        this.addForm.name = book.name;
      }
    },

    // ====== MEDIA FILE SELECTOR ======
    async pickMediaFile() {
      if (files?.openFileDialog) {
        const filePath = await files.openFileDialog({
          title: "Selecionar Mídia",
          filters: [
            { name: "Mídia e documentos", extensions: ["mp4", "mkv", "avi", "mov", "wmv", "webm", "mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "pdf", "ppt", "pptx"] },
            { name: "Vídeos", extensions: ["mp4", "mkv", "avi", "mov", "wmv", "webm"] },
            { name: "Áudios", extensions: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a"] },
            { name: "Documentos", extensions: ["pdf", "ppt", "pptx"] },
            { name: "Todos", extensions: ["*"] },
          ],
        });
        return filePath;
      }
      this.$alert.error({ text: "Seleção de arquivos disponível apenas na versão desktop.", translate: false });
    },

    async selectMediaFile() {
      const filePath = await this.pickMediaFile();
      if (!filePath) return;
      this.addForm.filePath = filePath;
      if (!this.addForm.name) this.addForm.name = filePath.split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
    },
    // ====== PRESENTATION FILE SELECTOR ======
    async selectPresentationFile() {
      if (!files?.openFileDialog) {
        this.$alert.error({ text: "Selecao de arquivos disponivel apenas na versao desktop.", translate: false });
        return;
      }

      const filePath = await files.openFileDialog({
        title: "Selecionar apresentacao",
        filters: [
          { name: "Apresentacoes", extensions: ["pdf", "ppt", "pptx"] },
          { name: "PDF", extensions: ["pdf"] },
          { name: "PowerPoint", extensions: ["ppt", "pptx"] },
        ],
      });

      if (filePath) {
        this.addForm.filePath = filePath;
        if (!this.addForm.name) {
          const fileName = filePath.split(/[\\/]/).pop();
          this.addForm.name = fileName.replace(/\.[^.]+$/, "");
        }
      }
    },

    // ====== EXECUTE/PROJECT ITEMS ======
    executeItem(item, musicMode = "audio") {
      // Serialize clicks, including file validation and conversion. A click made
      // while the preceding item loads must not disappear.
      const previous = this.liturgyExecution || Promise.resolve();
      const execution = previous.catch(() => {}).then(async () => {
        this.liturgyTransitionInProgress = true;
        try {
          await this.executeItemNow(item, musicMode);
        } finally {
          this.liturgyTransitionInProgress = false;
        }
      });
      this.liturgyExecution = execution;
      return execution;
    },
    async executeItemNow(item, musicMode = "audio") {
      const playbackOnly = item.type === "music" && musicMode === "audio_only_playback";
      if (playbackOnly && !this.musicHasPlayback(item)) return;
      const audioOnly = item.type === "music" && (musicMode === "audio_only" || playbackOnly);
      if (audioOnly) musicMode = playbackOnly ? "instrumental" : (this.musicHasAudio(item) ? "audio" : "instrumental");
      if (item.type === "scheduled_item") {
        const category = this.scheduledCategories.find(category => category.id === item.categoryId);
        if (!category) return this.scheduledError("A categoria deste Item Agendado foi excluída ou não está disponível.");
        const now = new Date();
        const today = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
        const entry = category.items.find(entry => entry.date === today);
        if (!entry) return this.scheduledError(`Não há arquivo agendado em “${  category.name  }” para hoje (${  today  }).`);
        try {
          if (!await files?.isFileReadable?.(entry.filePath)) return this.scheduledError(`O arquivo agendado não está acessível: ${  entry.filePath}`);
        } catch { return this.scheduledError(`O arquivo agendado não está acessível: ${  entry.filePath}`); }
        item = { ...item, type: "media", name: category.name, subtitle: entry.name, filePath: entry.filePath };
      }
      if (item.type === "media" && !item.filePath) return;
      if (item.type === "music" && !item.musicId) return;

      const durationMs = this.getLiturgyTransitionDurationMs();
      this.liturgyExternalTargetVolume = 100;
      const hasActiveItem = this.hasActiveLiturgyItem();
      const shouldTransition = hasActiveItem && durationMs > 0;
      const phaseDurationMs = Math.round(durationMs / 2);

      try {
        if (shouldTransition) {
          const audioFadeOut = this.fadeCurrentLiturgyAudioOut(phaseDurationMs);
          await Promise.all([transitionProjection(this.$appdata, true, phaseDurationMs), audioFadeOut]);
        }

        await this.stopActiveLiturgyPlayback(item);

      let targetModule = null;

      switch (item.type) {
        case "music":
          if (item.musicId) {
            await this.$media.open({ id_music: item.musicId, mode: musicMode, audio_only: audioOnly });
            targetModule = "media";
          }
          break;
        case "verse":
          if (item.verseBookId && item.verseChapter) {
            targetModule = "bible";
            this.$nextTick(() => {
              this.$appdata.set("modules.bible.data.navigate", {
                bookId: item.verseBookId,
                chapter: item.verseChapter,
                verses: item.verseNumbers,
              });
            });
          }
          break;
        case "media":
          if (item.filePath) {
            const useInternal = this.$userdata.get("modules.config.media_use_internal_player");
            
            if (useInternal) {
              openExternalMedia(this.$appdata, {
                filePath: item.filePath,
                title: item.name || "",
                subtitle: item.subtitle || "",
                volume: shouldTransition ? 0 : this.liturgyExternalTargetVolume,
              });

              const isAudio = isAudioFile(item.filePath);
              if (!isAudio) {
                targetModule = "external_media";
              }

              if (isAudio) {
              // Audio goes straight to footer bar (minimized)
                this.$appdata.set("modules.external_media.minimized", true);
              } else {
              // Video opens the full module
                this.$appdata.set("modules.external_media.show", true);
              }
            } else {
            // Reproduz no reprodutor padrão do sistema operacional
              if (window.electronAPI && window.electronAPI.openPath) {
                window.electronAPI.openPath(item.filePath);
              }
            }
          }
          break;
        case "presentation":
          if (item.filePath && files?.preparePresentationFile) {
            const prepared = await files.preparePresentationFile(item.filePath);
            if (!prepared?.ok) {
              const details = prepared?.details ? `\n\nDetalhes: ${prepared.details}` : "";
              this.$alert.error({
                text: `${prepared?.error || "Nao foi possivel preparar a apresentacao."}${details}`,
                translate: false,
              });
              return;
            }

            this.$appdata.set("modules.presentation.sourcePath", prepared.sourcePath || item.filePath);
            this.$appdata.set("modules.presentation.preparedPath", prepared.filePath);
            this.$appdata.set("modules.presentation.titleText", item.name || item.subtitle || "Apresentacao");
            this.$appdata.set("modules.presentation.config.slide_index", 0);
            this.$appdata.set("modules.presentation.config.total_slides", 0);
            targetModule = "presentation";
          }
          break;
        case "link":
          if (item.url) {
            if (isWebUrl(item.url)) {
              openExternalMedia(this.$appdata, {
                filePath: item.url,
                title: item.name || (isYouTubeUrl(item.url) ? "YouTube" : "Link"),
                subtitle: item.subtitle || item.url,
                volume: shouldTransition ? 0 : this.liturgyExternalTargetVolume,
              });
              this.$appdata.set("modules.external_media.show", true);
              targetModule = "external_media";
            }
          }
          break;
      }

      if (targetModule && !audioOnly) {
        const usesIndependentMediaSettings = targetModule === "external_media"
          && this.$userdata.get("modules.config.media_sync_projection_settings") === false;
        const fullscreen = usesIndependentMediaSettings
          ? this.$userdata.get("modules.config.media_slide_fullscreen") !== false
          : this.$userdata.get("modules.config.slide_fullscreen") !== false;
        const showExternalMediaOnlyInOperator = targetModule === "external_media" && fullscreen;
        const popups = this.$appdata.get("popups") || [];
        const isPopupOpened = popups.some(p => p && !p.closed
          && (p.popupRole || "projection") === "projection" && p.popupModule === targetModule);
        const currentModule = this.$appdata.get("popup_module");

        if (!showExternalMediaOnlyInOperator && (!isPopupOpened || currentModule !== targetModule)) {
          let selectedMonitors = [];
          if (window.electronAPI && window.electronAPI.getDisplays) {
            const displays = await window.electronAPI.getDisplays();
            if (displays && displays.length > 1) {
              let configMonitors = this.$userdata.get(
                usesIndependentMediaSettings
                  ? "modules.config.media_slide_monitor"
                  : "modules.config.slide_monitor",
              );
              if (!Array.isArray(configMonitors)) {
                configMonitors = configMonitors ? [configMonitors] : [];
              }
              const primary = displays.find(d => d.isPrimary) || displays[0];
              selectedMonitors = configMonitors.filter(m => m !== primary.id);
            }
          }
          
          if (selectedMonitors.length > 0) {
            await this.$popup.syncMonitors(selectedMonitors, targetModule, true, fullscreen);
          } else if (targetModule !== "external_media") {
            await this.$popup.open({ module: targetModule, fullscreen });
          }
        }
        if (targetModule === "presentation" && window.electronAPI?.setPresentationShortcutsEnabled) {
          window.electronAPI.setPresentationShortcutsEnabled(true);
        }
      }

        const returnModule = targetModule || (
          item.type === "media" && this.$userdata.get("modules.config.media_use_internal_player")
            ? "external_media" : null
        );
        if (returnModule && returnModule !== "media") {
          await this.$media.syncReturnMonitor(true, () => true, returnModule);
        }

        await this.runAutomationForItem(item);

        if (shouldTransition) {
          await this.$nextTick();
          const audioFadeIn = this.fadeCurrentLiturgyAudioIn(item, musicMode, phaseDurationMs);
          await Promise.all([transitionProjection(this.$appdata, false, durationMs - phaseDurationMs), audioFadeIn]);
        }
      } finally {
        if (shouldTransition && this.$appdata.get("projection_transition")?.active) {
          await transitionProjection(this.$appdata, false, durationMs - phaseDurationMs);
        }
      }
    },

    async openMusicLyric(item) {
      if (!item?.musicId) return;
      await this.$media.openLyric({ id_music: item.musicId });
    },

    getLiturgyTransitionDurationMs() {
      const seconds = Number(this.$userdata.get("modules.config.media_liturgy_transition_duration"));
      const normalizedSeconds = Number.isFinite(seconds) ? Math.min(3, Math.max(0, seconds)) : 0.6;
      return Math.round(normalizedSeconds * 1000);
    },

    hasActiveLiturgyItem() {
      const popups = this.$appdata.get("popups") || [];
      return Boolean(
        this.$appdata.get("modules.media.id_music") ||
        this.$appdata.get("modules.external_media.filePath") ||
        this.$appdata.get("popup_module") ||
        popups.some(popup => popup && !popup.closed),
      );
    },

    fadeCurrentLiturgyAudioOut(durationMs) {
      const audio = this.$media.getElement?.();
      if (audio && !audio.paused && this.$appdata.get("modules.media.id_music")) {
        return this.$media.fadeOut(audio, durationMs);
      }

      if (this.$appdata.get("modules.external_media.filePath")) {
        return this.fadeExternalMediaVolume(this.liturgyExternalTargetVolume, 0, durationMs);
      }

      return Promise.resolve();
    },

    fadeCurrentLiturgyAudioIn(item, musicMode, durationMs) {
      if (item?.type === "music" && ["audio", "instrumental"].includes(musicMode) && this.$appdata.get("modules.media.id_music")) {
        const audio = this.$media.getElement?.();
        if (!audio) return Promise.resolve();
        const configuredVolume = Number(this.$appdata.get("modules.media.config.volume"));
        const targetVolume = Number.isFinite(configuredVolume) ? configuredVolume / 100 : 1;
        return this.$media.fadeIn(audio, targetVolume, durationMs);
      }

      if (["media", "link"].includes(item?.type) && this.$appdata.get("modules.external_media.filePath")) {
        return this.fadeExternalMediaVolume(0, this.liturgyExternalTargetVolume, durationMs);
      }

      return Promise.resolve();
    },

    async fadeExternalMediaVolume(from, to, durationMs) {
      this.setExternalMediaVolume(from);
      const steps = Math.max(1, Math.ceil(Math.max(0, durationMs) / 50));
      for (let step = 1; step <= steps; step++) {
        const volume = Math.round(from + ((to - from) * step) / steps);
        this.setExternalMediaVolume(volume);
        if (step < steps) {
          await new Promise(resolve => window.setTimeout(resolve, 50));
        }
      }
    },

    setExternalMediaVolume(volume) {
      this.$appdata.set("modules.external_media.config.volume", volume);
      this.$appdata.set("modules.external_media.config.request_action", {
        action: "set_volume",
        value: volume,
        time: Date.now(),
      });
    },

    async stopActiveLiturgyPlayback(nextItem) {
      const nextIsCurrentMusic = nextItem?.type === "music" &&
        nextItem.musicId === this.$appdata.get("modules.media.id_music");

      if (this.$appdata.get("modules.media.id_music") && !nextIsCurrentMusic) {
        await this.$media.close(true, { preserveProjection: true });
      }

      if (this.$appdata.get("modules.external_media.filePath")) {
        this.$appdata.set("modules.external_media.show", false);
        this.$appdata.set("modules.external_media.minimized", false);
        this.$appdata.set("modules.external_media.filePath", "");
        this.$appdata.set("modules.external_media.title", "");
        this.$appdata.set("modules.external_media.subtitle", "");
        this.$appdata.set("modules.external_media.config.volume", this.liturgyExternalTargetVolume);
        await this.$automation.restore("external_media_closed");
      }
    },

    async runAutomationForItem(item) {
      if (!this.supportsAutomationTrigger(item?.type) || !item?.automationTriggerId) return;

      try {
        const result = await this.$automation.runItemTrigger(item, {
          selectedDay: this.selectedDay,
          selectedIndex: this.selectedItemIndex,
        });
        const config = this.$automation.getConfig();
        if (!config.showStatus || result?.skipped || result?.ok) return;

        this.$alert.error({ text: result?.error || "Falha ao executar gatilho de automação.", translate: false });
      } catch (error) {
        const config = this.$automation.getConfig();
        if (config.showStatus) {
          this.$alert.error({ text: "Falha ao executar gatilho de automação.", error, translate: false });
        }
      }
    },

    // ====== CUSTOM LITURGIES ======
    createCustomLiturgy() {
      if (!this.newCustomName.trim()) return;
      this.customLiturgies.push({
        name: this.newCustomName.trim(),
        items: [],
        notes: "",
      });
      this.selectedCustomIndex = this.customLiturgies.length - 1;
      this.newCustomName = "";
      this.showNewCustomDialog = false;
      this.saveLiturgy();
    },
    removeCustomLiturgy(index) {
      this.$alert.yesno(
        { text: `Deseja remover a liturgia "${this.customLiturgies[index].name}"?`, translate: false },
        (resp) => {
          if (resp === "yes") {
            this.customLiturgies.splice(index, 1);
            if (this.selectedCustomIndex >= this.customLiturgies.length) {
              this.selectedCustomIndex = Math.max(0, this.customLiturgies.length - 1);
            }
            this.saveLiturgy();
          }
        },
      );
    },

    itemDisplayName(item) {
      if (item.type === "scheduled_item") return this.scheduledCategories.find(category => category.id === item.categoryId)?.name || "Categoria agendada excluída";
      return item.name ? item.name.replace(/^undefined\s*-\s*/, "") : "";
    },
    scheduledError(text) { this.$alert.error({ text, translate: false }); },
    saveScheduledCategories() {
      this.$userdata.set(`modules.${  this.module_id  }.scheduledCategories`, JSON.parse(JSON.stringify(this.scheduledCategories)));
    },
    selectScheduledCategory(id) {
      this.selectedScheduledCategoryId = id;
      this.scheduledFilePath = "";
      this.setScheduledDay("today");
    },
    setScheduledDay(shortcut) {
      const date = new Date();
      if (shortcut === "saturday") date.setDate(date.getDate() + ((6 - date.getDay() + 7) % 7 || 7));
      this.scheduledDate = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
    },
    scheduledMonth(date) {
      return ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"][Number(date.slice(5, 7)) - 1];
    },
    createScheduledCategory() {
      const name = this.newScheduledCategoryName.trim();
      if (!name) return;
      const category = { id: crypto.randomUUID(), name, items: [] };
      this.scheduledCategories.push(category);
      this.selectScheduledCategory(category.id);
      this.newScheduledCategoryName = "";
      this.saveScheduledCategories();
    },
    deleteScheduledCategory() {
      const category = this.selectedScheduledCategory;
      if (!category) return;
      const remove = () => {
        this.scheduledCategories = this.scheduledCategories.filter(entry => entry.id !== category.id);
        this.selectedScheduledCategoryId = this.scheduledCategories[0]?.id || null;
        this.saveScheduledCategories();
      };
      if (category.items.length) this.$alert.yesno({ text: `Excluir “${  category.name  }” e seus agendamentos? Os arquivos originais serão mantidos.`, translate: false }, response => { if (response === "yes") remove(); });
      else remove();
    },
    async selectScheduledFile() {
      const filePath = await this.pickMediaFile();
      if (filePath) {
        this.scheduledFilePath = filePath;
        if (!this.scheduledDate) this.setScheduledDay("today");
      }
    },
    validScheduledDate(date, exceptId = null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
        this.scheduledError("Informe uma data válida."); return false;
      }
      if (this.selectedScheduledCategory.items.some(entry => entry.id !== exceptId && entry.date === date)) {
        this.scheduledError("Já existe um arquivo nesta categoria para essa data. Escolha outra data."); return false;
      }
      return true;
    },
    addScheduledFile() {
      if (!this.selectedScheduledCategory || !this.scheduledFilePath || !this.validScheduledDate(this.scheduledDate)) return;
      this.selectedScheduledCategory.items.push({ id: crypto.randomUUID(), name: this.scheduledFilePath.split(/[\\/]/).pop(), filePath: this.scheduledFilePath, date: this.scheduledDate });
      this.scheduledFilePath = "";
      this.saveScheduledCategories();
    },
    changeScheduledDate(entry, event) {
      const date = event.target.value;
      if (!this.validScheduledDate(date, entry.id)) { event.target.value = entry.date; return; }
      entry.date = date;
      this.saveScheduledCategories();
    },
    removeScheduledFile(id) {
      this.selectedScheduledCategory.items = this.selectedScheduledCategory.items.filter(entry => entry.id !== id);
      this.saveScheduledCategories();
    },
    // ====== PERSISTENCE ======
    saveLiturgy() {
      this.$userdata.set(`modules.${this.module_id}.liturgies`, JSON.parse(JSON.stringify(this.liturgies)));
      this.$userdata.set(`modules.${this.module_id}.dayNotes`, JSON.parse(JSON.stringify(this.dayNotes)));
      this.$userdata.set(`modules.${this.module_id}.customLiturgies`, JSON.parse(JSON.stringify(this.customLiturgies)));
    },
    loadSavedLiturgies() {
      this.scheduledCategories = JSON.parse(JSON.stringify(this.$userdata.get(`modules.${  this.module_id  }.scheduledCategories`) || []));
      this.selectedScheduledCategoryId = this.scheduledCategories[0]?.id || null;
      const shouldClearChecks = !this.$appdata.get("liturgy_checks_cleared");

      const saved = this.$userdata.get(`modules.${this.module_id}.liturgies`);
      if (saved) {
        if (shouldClearChecks) {
          for (const day in saved) {
            saved[day].forEach(item => {
              if (item.done) item.done = false;
            });
          }
        }
        this.liturgies = { ...this.liturgies, ...saved };
      }

      const savedNotes = this.$userdata.get(`modules.${this.module_id}.dayNotes`);
      if (savedNotes) {
        this.dayNotes = { ...this.dayNotes, ...savedNotes };
      }

      const savedCustom = this.$userdata.get(`modules.${this.module_id}.customLiturgies`);
      if (savedCustom && Array.isArray(savedCustom)) {
        if (shouldClearChecks) {
          savedCustom.forEach(custom => {
            if (custom.items) {
              custom.items.forEach(item => {
                if (item.done) item.done = false;
              });
            }
          });
        }
        this.customLiturgies = savedCustom;
      }

      if (shouldClearChecks) {
        this.saveLiturgy();
        this.$appdata.set("liturgy_checks_cleared", true);
      }
    },

    // ====== DATA LOADING ======
    async loadData() {
      this.loadSavedLiturgies();

      // Load music list
      try {
        const musicData = await this.$database.get(`${this.$i18n.locale}_musics`, { silent: true });
        if (musicData && Array.isArray(musicData)) {
          this.musicList = musicData.map(m => {
            const hymnalAlbum = getPreferredHymnalAlbum(m);
            const hymnalTrack = hymnalAlbum?.pivot?.track ?? hymnalAlbum?.track ?? null;
            return {
              id_music: m.id_music,
              hymnal_track: hymnalTrack,
              name: m.name,
              album_names: m.albums ? m.albums.map(a => a.name).join(", ") : "",
              albums: m.albums,
              has_music: m.has_music,
              url_music: m.url_music,
              has_instrumental_music: m.has_instrumental_music,
              url_instrumental_music: m.url_instrumental_music,
            };
          });
        }
      } catch (e) {
        console.error("Failed to load music data:", e);
      }

      // Load bible books
      try {
        const books = await this.$database.get(`${this.$i18n.locale}_bible_book`, { silent: true });
        if (books && Array.isArray(books)) {
          this.bibleBooks = books;
        }
      } catch (e) {
        console.error("Failed to load bible books:", e);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.module-full-page {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--card-bg);
  z-index: 10;
}

.modern-input-no-thick:deep(.v-field--variant-outlined.v-field--focused .v-field__outline) {
  --v-field-border-width: 1px !important;
}

.module-icon-box {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--accent-blue) 0%, var(--accent-blue-dark) 100%);
  border-radius: 12px;
  color: white;
  box-shadow: 0 4px 10px rgba(0, 151, 215, 0.3);
}

.liturgy-day-chip {
  transition: all 0.2s ease;
  cursor: pointer;
  &:hover {
    transform: translateY(-1px);
  }
}

.liturgy-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 8px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--card-bg);
  border: 1px solid var(--glass-border, transparent);
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-hover);
  }
}

.liturgy-item-active {
  background: rgba(var(--v-theme-primary), 0.08) !important;
  border-color: rgba(var(--v-theme-primary), 0.3) !important;
  box-shadow: 0 4px 15px rgba(var(--v-theme-primary), 0.1) !important;
}

.liturgy-category-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  margin: 16px 16px 8px;
  border-radius: 10px;
  cursor: pointer;
  background: rgba(255, 193, 7, 0.06);
  border: 1px dashed rgba(255, 193, 7, 0.3);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 193, 7, 0.12);
  }
}

.liturgy-item.liturgy-subitem {
  margin-left: 40px;
  border-left: 3px solid rgba(255, 193, 7, 0.3);
}

.liturgy-item-number {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent-blue);
  min-width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(0, 151, 215, 0.08);
  margin-right: 12px;
  flex-shrink: 0;
}

.liturgy-ghost {
  opacity: 0.4;
  background: rgba(0, 151, 215, 0.05);
  border-radius: 12px;
}

.modern-glass-card {
  background: var(--card-bg) !important;
  border: 1px solid var(--glass-border) !important;
  box-shadow: var(--shadow-hover) !important;
}

.scheduled-manager { color: var(--sidebar-text); }
.scheduled-header { display: flex; align-items: center; gap: 16px; padding: 24px 28px; border-bottom: 1px solid var(--glass-border); }
.scheduled-header h2 { font-size: 21px; font-weight: 700; letter-spacing: -0.4px; }
.scheduled-header p { margin-top: 4px; font-size: 13px; color: var(--sidebar-text-secondary); }
.scheduled-icon { display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 14px; background: rgba(var(--v-theme-primary), 0.1); color: rgb(var(--v-theme-primary)); flex-shrink: 0; }
.scheduled-body { display: flex; min-height: 0; overflow-y: auto; }
.scheduled-sidebar { width: 250px; flex-shrink: 0; padding: 24px 16px; background: rgba(var(--v-theme-primary), 0.025); border-right: 1px solid var(--glass-border); }
.scheduled-section-label { display: flex; align-items: center; gap: 8px; font-size: 10px; font-weight: 700; letter-spacing: 1.2px; color: var(--sidebar-text-secondary); }
.scheduled-section-label span { padding: 2px 7px; border-radius: 6px; background: rgba(var(--v-theme-primary), 0.08); color: rgb(var(--v-theme-primary)); letter-spacing: 0; }
.scheduled-category-list { display: grid; gap: 6px; margin: 16px 0 20px; }
.scheduled-category { display: flex; align-items: center; gap: 10px; text-align: left; padding: 12px; width: 100%; border: 1px solid transparent; border-radius: 12px; color: var(--sidebar-text-secondary); transition: background 0.15s; }
.scheduled-category:hover { background: rgba(var(--v-theme-primary), 0.05); }
.scheduled-category.is-selected { color: rgb(var(--v-theme-primary)); background: rgba(var(--v-theme-primary), 0.09); border-color: rgba(var(--v-theme-primary), 0.15); }
.scheduled-category-name { min-width: 0; flex: 1; overflow-wrap: anywhere; font-size: 13px; font-weight: 600; }
.scheduled-category-name small { display: block; margin-top: 3px; font-size: 11px; font-weight: 400; color: var(--sidebar-text-secondary); }
.scheduled-create { display: grid; gap: 10px; }
.scheduled-sidebar-tip { display: flex; gap: 8px; margin-top: 20px; font-size: 11px; line-height: 1.6; color: var(--sidebar-text-secondary); }
.scheduled-content { flex: 1; min-width: 0; padding: 24px; container-type: inline-size; }
.scheduled-category-heading { font-size: 18px; overflow-wrap: anywhere; margin-bottom: 4px; }
.scheduled-muted { color: var(--sidebar-text-secondary); }
.scheduled-composer { padding: 18px; border: 1px solid var(--glass-border); border-radius: 16px; background: var(--card-bg); }
.scheduled-file-picker { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; padding: 18px; border: 1px dashed rgba(var(--v-theme-primary), 0.35); border-radius: 12px; background: rgba(var(--v-theme-primary), 0.035); color: rgb(var(--v-theme-primary)); transition: background 0.15s; }
.scheduled-file-picker:hover { background: rgba(var(--v-theme-primary), 0.09); }
.scheduled-file-picker.has-file { border-style: solid; }
.scheduled-file-copy { flex: 1; min-width: 0; }
.scheduled-file-copy strong { display: block; font-size: 14px; overflow-wrap: anywhere; }
.scheduled-file-copy small { display: block; margin-top: 5px; font-size: 11px; color: var(--sidebar-text-secondary); overflow-wrap: anywhere; }
.scheduled-date-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.scheduled-date-input { min-width: 170px; }
.scheduled-shortcuts { display: flex; flex-wrap: wrap; }
.scheduled-empty { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 32px 20px; border: 1px dashed var(--glass-border); border-radius: 14px; color: var(--sidebar-text-secondary); }
.scheduled-empty strong { font-size: 14px; color: var(--sidebar-text); }
.scheduled-empty p { margin-top: 8px; font-size: 12px; line-height: 1.7; max-width: 370px; }
.scheduled-welcome { min-height: 390px; justify-content: center; border: 0; }
.scheduled-welcome h3 { font-size: 20px; color: var(--sidebar-text); }
.scheduled-entries { display: grid; grid-template-columns: minmax(0, 1fr); gap: 10px; min-width: 0; }
.scheduled-entry { display: grid; grid-template-columns: 46px minmax(0, 1fr) 158px 28px; min-width: 0; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--glass-border); border-radius: 12px; background: var(--card-bg); }
.scheduled-date-badge { width: 46px; flex-shrink: 0; text-align: center; padding: 6px 0; border-radius: 10px; background: rgba(var(--v-theme-primary), 0.08); color: rgb(var(--v-theme-primary)); }
.scheduled-date-badge strong { display: block; font-size: 20px; line-height: 1.2; }
.scheduled-date-badge span { font-size: 9px; font-weight: 700; letter-spacing: 1px; }
.scheduled-entry-copy { flex: 1; min-width: 0; }
.scheduled-entry-copy strong { display: block; font-size: 13px; overflow-wrap: anywhere; }
.scheduled-entry-copy span { display: block; font-size: 11px; color: var(--sidebar-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4px; }
.scheduled-entry-date { width: 100%; min-width: 0; }
.scheduled-entry-date :deep(.v-field__input) { min-width: 0; }
.scheduled-header, .scheduled-footer { flex-shrink: 0; }
@container (max-width: 540px) {
  .scheduled-entry { grid-template-columns: 46px minmax(0, 1fr) 28px; }
  .scheduled-entry-date { grid-column: 2; grid-row: 2; max-width: 190px; }
  .scheduled-entry > .v-btn { grid-column: 3; grid-row: 1; }
  .scheduled-entry-copy span { white-space: normal; overflow-wrap: anywhere; }
}
.scheduled-footer { display: flex; align-items: center; justify-content: flex-end; gap: 6px; padding: 12px 24px; border-top: 1px solid var(--glass-border); font-size: 11px; color: var(--sidebar-text-secondary); }
.scheduled-manager button:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 3px; }
@media (max-width: 700px) {
  .scheduled-header { padding: 20px; }
  .scheduled-header p { display: none; }
  .scheduled-body { flex-direction: column; }
  .scheduled-sidebar { width: 100%; border-right: 0; border-bottom: 1px solid var(--glass-border); }
  .scheduled-category-list { grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); }
  .scheduled-sidebar-tip { display: none; }
  .scheduled-content { padding: 18px; }

}
</style>
