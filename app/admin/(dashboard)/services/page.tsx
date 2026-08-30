'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff, Save, Sparkles } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { MediaUploadField, deleteUploadedMedia } from '@/components/admin/MediaUploadField';
import { AdminRepository } from '@/lib/repositories/adminRepository';
import type { SiteSettings, StorefrontServiceSettings } from '@/types';

type ServiceKey = 'branding' | 'bagDesigner';
type ServiceState = Record<ServiceKey, StorefrontServiceSettings>;

const serviceDefinitions: Array<{
  key: ServiceKey;
  title: string;
  description: string;
  route: string;
  fallbackImage: string;
}> = [
  {
    key: 'branding',
    title: 'Полиграфия и брендирование',
    description: 'Печать, этикетки и брендированная упаковка.',
    route: '/branding',
    fallbackImage: '/catalog/category-icons-v3/branding-service-v2.webp',
  },
  {
    key: 'bagDesigner',
    title: 'Конструктор пакета',
    description: 'Подбор формы, размера и визуализация пакета.',
    route: '/bag-designer',
    fallbackImage: '/catalog/category-icons-v3/bag-designer-service-v2.webp',
  },
];

function getDefaultServices(): ServiceState {
  return Object.fromEntries(serviceDefinitions.map((service) => [service.key, {
    enabled: true,
    navigationImage: service.fallbackImage,
  }])) as ServiceState;
}

export default function AdminStorefrontServicesPage() {
  const [services, setServices] = useState<ServiceState>(getDefaultServices);
  const [persistedServices, setPersistedServices] = useState<ServiceState>(getDefaultServices);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    AdminRepository.getSettings()
      .then((settings) => {
        if (!active) return;
        const next = getDefaultServices();
        for (const service of serviceDefinitions) {
          next[service.key] = {
            ...next[service.key],
            ...settings.modules?.[service.key],
            enabled: settings.modules?.[service.key]?.enabled ?? true,
          };
        }
        setServices(next);
        setPersistedServices(next);
      })
      .catch((error: unknown) => {
        if (active) setPageError(error instanceof Error ? error.message : 'Не удалось загрузить настройки сервисов.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const updateService = (key: ServiceKey, patch: Partial<StorefrontServiceSettings>) => {
    setServices((current) => ({
      ...current,
      [key]: { ...current[key], ...patch },
    }));
  };

  const cleanupStagedImage = (key: ServiceKey) => {
    const stagedPath = services[key].navigationImagePath;
    if (stagedPath && stagedPath !== persistedServices[key].navigationImagePath) {
      void deleteUploadedMedia(stagedPath).catch(() => undefined);
    }
  };

  const save = async () => {
    setSaving(true);
    setPageError('');
    setNotice('');
    try {
      const saved = await AdminRepository.saveSettings({ modules: services } as Partial<SiteSettings>);
      const savedServices = getDefaultServices();
      for (const service of serviceDefinitions) {
        savedServices[service.key] = {
          ...savedServices[service.key],
          ...saved.modules?.[service.key],
          enabled: saved.modules?.[service.key]?.enabled ?? services[service.key].enabled,
        };
      }

      let cleanupFailed = false;
      for (const service of serviceDefinitions) {
        const previousPath = persistedServices[service.key].navigationImagePath;
        if (!previousPath || previousPath === savedServices[service.key].navigationImagePath) continue;
        try {
          await deleteUploadedMedia(previousPath);
        } catch {
          cleanupFailed = true;
        }
      }
      setServices(savedServices);
      setPersistedServices(savedServices);
      setNotice(cleanupFailed
        ? 'Настройки сохранены, но один из старых файлов не удалось удалить из Storage.'
        : 'Сервисы витрины обновлены. Изменения уже доступны в каталоге.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Настройки сервисов не сохранены.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="Сервисы витрины"
        description="Управляйте видимостью и иллюстрациями сервисов в боковом каталоге и мобильной ленте."
      />

      {(pageError || notice) ? (
        <p className={`sp-alert text-sm ${pageError ? 'sp-alert-danger' : 'sp-alert-success'}`} role={pageError ? 'alert' : 'status'}>
          {pageError || notice}
        </p>
      ) : null}

      {loading ? (
        <p className="py-12 text-center text-sm text-[var(--sp-ink-tertiary)]">Загрузка сервисов…</p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {serviceDefinitions.map((service) => {
              const value = services[service.key];
              return (
                <section key={service.key} className="admin-panel overflow-hidden">
                  <div className="border-b border-[var(--sp-line)] px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-extended text-lg font-bold text-[var(--sp-ink)]">{service.title}</h2>
                        <p className="mt-1 text-xs leading-5 text-[var(--sp-ink-tertiary)]">{service.description}</p>
                        <p className="mt-1 font-mono text-[10px] text-[var(--sp-ink-muted)]">{service.route}</p>
                      </div>
                      <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-line)] bg-[var(--sp-surface-inset)] px-3 text-xs font-bold text-[var(--sp-ink)]">
                        <input
                          type="checkbox"
                          checked={value.enabled}
                          onChange={(event) => updateService(service.key, { enabled: event.target.checked })}
                          className="size-4 accent-[var(--sp-brand)]"
                        />
                        {value.enabled ? <Eye className="size-4 text-[var(--sp-brand)]" aria-hidden="true" /> : <EyeOff className="size-4 text-[var(--sp-ink-muted)]" aria-hidden="true" />}
                        {value.enabled ? 'Показывать' : 'Скрыт'}
                      </label>
                    </div>
                  </div>

                  <div className="p-5">
                    <MediaUploadField
                      kind="service-navigation"
                      label="Иллюстрация в навигации"
                      recommendation="800×800 px · удаление вернёт стандартную"
                      value={value.navigationImage || service.fallbackImage}
                      optional
                      onUploaded={(media) => {
                        cleanupStagedImage(service.key);
                        updateService(service.key, {
                          navigationImage: media.url,
                          navigationImagePath: media.path,
                        });
                      }}
                      onClear={() => {
                        cleanupStagedImage(service.key);
                        updateService(service.key, {
                          navigationImage: service.fallbackImage,
                          navigationImagePath: undefined,
                        });
                      }}
                    />
                  </div>
                </section>
              );
            })}
          </div>

          <div className="admin-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex max-w-3xl items-start gap-2 text-xs leading-5 text-[var(--sp-ink-secondary)]">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--sp-brand)]" aria-hidden="true" />
              Стандартные изображения входят в проект. Загруженные замены сохраняются в Firebase Storage и привязываются к настройкам storefront.
            </p>
            <button type="button" onClick={() => void save()} disabled={saving} className="admin-button-primary shrink-0 px-5 disabled:cursor-wait disabled:opacity-60">
              <Save className="size-4" aria-hidden="true" /> {saving ? 'Сохранение…' : 'Сохранить сервисы'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
