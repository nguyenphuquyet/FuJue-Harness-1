'use client'

import { Button, Input, Message, Switch, Tag } from '@arco-design/web-react'
import { IconDownload, IconSave } from '@arco-design/web-react/icon'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { DownloadAsset, DownloadConfig } from '@/lib/downloads'
import { sendAdminJson } from './api'

const OS_LABEL: Readonly<Record<DownloadAsset['os'], string>> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
}

/**
 * Installer publishing: version, release page, and per-platform asset links.
 *
 * @param props - the configuration the public download page renders.
 * @returns the download settings page.
 */
export function AdminDownloadsView({ config }: { readonly config: DownloadConfig }) {
  const router = useRouter()
  const [version, setVersion] = useState(config.version)
  const [releaseUrl, setReleaseUrl] = useState(config.releaseUrl)
  const [assets, setAssets] = useState<DownloadAsset[]>([...config.assets])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const patchAsset = (id: string, patch: Partial<DownloadAsset>) => {
    setAssets(current => current.map(asset => (asset.id === id ? { ...asset, ...patch } : asset)))
  }

  const save = async () => {
    if (version.trim() === '') {
      setError('Nhập phiên bản phát hành.')
      return
    }
    setSaving(true)
    const failure = await sendAdminJson('PUT', '/api/admin/downloads', {
      version: version.trim(),
      releaseUrl: releaseUrl.trim(),
      assets: assets.map(asset => ({
        id: asset.id,
        label: asset.label,
        fileName: asset.fileName,
        url: asset.url,
        note: asset.note,
        enabled: asset.enabled,
      })),
    })
    setSaving(false)
    if (failure !== null) {
      setError(failure)
      return
    }
    Message.success('Đã cập nhật trang tải ứng dụng.')
    router.refresh()
  }

  return (
    <>
      <div className="fj-page-head">
        <div>
          <h1>Tải ứng dụng</h1>
          <p>Liên kết cài FuJue Harness hiển thị trên trang công khai và trong bảng điều khiển.</p>
        </div>
        <div className="fj-row" style={{ gap: 10 }}>
          <Button href="/download" target="_blank">
            <IconDownload /> Xem trang tải
          </Button>
          <Button type="primary" onClick={save} loading={saving}>
            <IconSave /> Lưu thay đổi
          </Button>
        </div>
      </div>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Phát hành</h2>
            <p>Dùng chung cho mọi nền tảng</p>
          </div>
        </div>
        <div className="fj-field-grid">
          <div className="fj-field">
            <label htmlFor="download-version">Phiên bản</label>
            <Input
              id="download-version"
              value={version}
              placeholder="0.2.2"
              onChange={value => setVersion(value)}
            />
            <span className="fj-field-hint">Hiển thị trên trang tải và trong tên tệp mặc định.</span>
          </div>
          <div className="fj-field">
            <label htmlFor="download-release">Trang phát hành</label>
            <Input
              id="download-release"
              value={releaseUrl}
              placeholder="https://github.com/…/releases"
              onChange={value => setReleaseUrl(value)}
            />
            <span className="fj-field-hint">Nơi người dùng xem ghi chú phát hành và tệp khác.</span>
          </div>
        </div>
      </section>

      <section className="fj-panel">
        <div className="fj-panel-head">
          <div>
            <h2>Bộ cài theo nền tảng</h2>
            <p>Để trống URL để dùng trang phát hành làm đích tải.</p>
          </div>
        </div>
        <div className="fj-stack">
          {assets.map(asset => (
            <div key={asset.id} className="fj-download-edit">
              <div className="fj-download-edit-head">
                <div className="fj-row" style={{ gap: 10 }}>
                  <Tag size="small" color="gray">
                    {OS_LABEL[asset.os]} · {asset.arch}
                  </Tag>
                  <span className="fj-cell-strong">{asset.label}</span>
                </div>
                <label className="fj-row" style={{ gap: 8, fontSize: 12.5, color: 'var(--fj-muted)' }}>
                  <Switch
                    size="small"
                    checked={asset.enabled}
                    onChange={checked => patchAsset(asset.id, { enabled: checked })}
                  />
                  Hiển thị
                </label>
              </div>
              <div className="fj-field-grid">
                <div className="fj-field">
                  <label htmlFor={`asset-label-${asset.id}`}>Tên hiển thị</label>
                  <Input
                    id={`asset-label-${asset.id}`}
                    value={asset.label}
                    onChange={value => patchAsset(asset.id, { label: value })}
                  />
                </div>
                <div className="fj-field">
                  <label htmlFor={`asset-file-${asset.id}`}>Tên tệp</label>
                  <Input
                    id={`asset-file-${asset.id}`}
                    value={asset.fileName}
                    onChange={value => patchAsset(asset.id, { fileName: value })}
                  />
                </div>
                <div className="fj-field fj-field-grid--full">
                  <label htmlFor={`asset-url-${asset.id}`}>URL tải trực tiếp</label>
                  <Input
                    id={`asset-url-${asset.id}`}
                    value={asset.url}
                    placeholder="https://…"
                    onChange={value => patchAsset(asset.id, { url: value })}
                  />
                </div>
                <div className="fj-field fj-field-grid--full">
                  <label htmlFor={`asset-note-${asset.id}`}>Ghi chú</label>
                  <Input
                    id={`asset-note-${asset.id}`}
                    value={asset.note}
                    maxLength={240}
                    onChange={value => patchAsset(asset.id, { note: value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        {error === null ? null : (
          <div style={{ color: 'var(--fj-rose)', fontSize: 12.5, marginTop: 12 }}>{error}</div>
        )}
      </section>

      <div className="fj-panel">
        <div className="fj-form-note">
          Trang công khai: <Link href="/download" className="fj-link-inline">/download</Link>. Người dùng đã đăng nhập
          có thể mở cùng trang này từ thanh điều hướng của bảng điều khiển.
        </div>
      </div>
    </>
  )
}
