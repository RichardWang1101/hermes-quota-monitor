/**
 * Quota Monitor — shared frontend for both versions.
 * Settings: gear icon toggles provider checkboxes, persisted via ctx.storage.
 * Language: i18n with zh/en toggle, persisted via ctx.storage.
 */
import { cn, haptic, host, Tip } from '@hermes/plugin-sdk'
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import { useEffect, useRef, useState } from 'react'

const TEXT_DIM = '#6b7280'
const DIVIDER = 'rgba(255,255,255,0.08)'

/* --- i18n --- */
const I18N = {
  zh: {
    title: '\ud83d\udcca 配额监控', close: '\u2715', settings: '\u2699',
    settingsHint: '选择要显示的提供商：', noProvider: '点击 \u2699 选择要显示的提供商',
    updated: '更新', reset: '重置', total: '总余额', granted: '赠送', toppedUp: '充值',
    balance: '余额', loading: '加载中...',
    cycle5h: '5小时额度', cycleWeek: '周额度', cycleMonth: '月额度',
    langSwitch: 'EN',
    resetFmt: (s) => { if(s<=0) return '已重置'; const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60); return d>0?`${d}天${h}时`:h>0?`${h}时${m}分`:`${m}分` },
    err_requestFailed: '请求失败', err_noKey: 'API Key 未配置', err_accountUnavailable: '账户不可用',
    err_noData: '无余额数据', err_noBaseUrl: '未配置 base_url', err_queryError: '查询异常',
  },
  en: {
    title: '\ud83d\udcca Quota Monitor', close: '\u2715', settings: '\u2699',
    settingsHint: 'Select providers to display:', noProvider: 'Click \u2699 to select providers',
    updated: 'Updated', reset: 'Reset', total: 'Total', granted: 'Granted', toppedUp: 'Top-up',
    balance: 'Balance', loading: 'Loading...',
    cycle5h: '5h Quota', cycleWeek: 'Weekly', cycleMonth: 'Monthly',
    langSwitch: '中文',
    resetFmt: (s) => { if(s<=0) return 'Reset'; const d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60); return d>0?`${d}d ${h}h`:h>0?`${h}h ${m}m`:`${m}m` },
    err_requestFailed: 'Request failed', err_noKey: 'API Key not configured', err_accountUnavailable: 'Account unavailable',
    err_noData: 'No balance data', err_noBaseUrl: 'base_url not configured', err_queryError: 'Query error',
  },
}
let _lang = 'zh'
function setLang(l) { _lang = l }
function t(key) { return I18N[_lang]?.[key] || I18N.zh[key] || key }
function tErr(msg) {
  const map = { '请求失败':'err_requestFailed', 'API Key 未配置':'err_noKey', '账户不可用':'err_accountUnavailable', '无余额数据':'err_noData', '未配置 base_url':'err_noBaseUrl', '查询异常':'err_queryError' }
  return t(map[msg] || '') || msg
}

function pctColor(p) { return p >= 80 ? '#ef4444' : p >= 50 ? '#f59e0b' : '#22c55e' }
function fmtAmt(n, c) { const num = parseFloat(n)||0; return c==='CNY' ? `\u00a5${num.toFixed(2)}` : `$${num.toFixed(2)}` }

const LOGOS = {
  deepseek: 'https://www.deepseek.com/favicon.ico',
  openrouter: 'https://openrouter.ai/favicon.ico',
  zhipu: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
}

/* --- Provider metadata (all known providers) --- */
const PROVIDER_meta = {
  deepseek: { label: 'DeepSeek', color: '#4D6BFE' },
  opencode_go: { label: 'OpenCode Go', color: '#ffffff' },
  openrouter: { label: 'OpenRouter', color: '#e879f9' },
  zhipu: { label: '智谱GLM', color: '#6366f1' },
  openai: { label: 'OpenAI', color: '#10a37f' },
}
function getProviderLabel(id) { return PROVIDER_meta[id]?.label || id }
function getProviderColor(id) { return PROVIDER_meta[id]?.color || '#888' }

/* --- Settings persistence --- */
let _ctx
function getEnabled() {
  try {
    const lang = _ctx?.storage?.get('lang')
    if (lang) setLang(lang)
    return _ctx?.storage?.get('enabled') || {}
  } catch { return {} }
}
function setEnabled(v) {
  try { _ctx?.storage?.set('enabled', v) } catch {}
}
function getLang() { return _lang }
function saveLang(l) {
  setLang(l)
  try { _ctx?.storage?.set('lang', l) } catch {}
}

/* --- Data fetch --- */
const _state = { d: null, l: new Set() }
let _apiBase = ''
async function _poll(force) {
  try {
    if (!force && _state.d) return // skip if already have data and not forced
    let r
    try { r = await _ctx.rest('/status') } catch(e) {}
    if (!r || r.error) {
      const gw = host.state.gateway?.get()
      const port = gw?.port || 9177
      const resp = await fetch(`http://127.0.0.1:${port}${_apiBase}/status`)
      r = await resp.json()
    }
    if (r && !r.error) { _state.d = r; for (const f of _state.l) f(r) }
    else if (_state.d) { /* keep old data on error */ }
  } catch(e) { console.log('[QM]', e.message) }
}
function useData() {
  const [d, setD] = useState(_state.d)
  useEffect(() => {
    _state.l.add(setD)
    _poll(true) // always force refresh on mount
    const id = setInterval(() => _poll(true), 5 * 60 * 1000)
    return () => { _state.l.delete(setD); clearInterval(id) }
  }, [])
  return { data: d, isLoading: !d }
}

/* --- Card renderers --- */
function Bar({ pct, color }) {
  return jsx('div', { style:{width:'100%',height:5,borderRadius:3,background:'rgba(255,255,255,0.08)',overflow:'hidden'},
    children: jsx('div', { style:{width:`${Math.min(pct,100)}%`,height:'100%',borderRadius:3,background:color||pctColor(pct),transition:'width .3s'} })
  })
}
function CycleRow({ label, pct, reset }) {
  const c = pctColor(pct)
  return jsxs('div', { className:'flex flex-col gap-1 py-1.5', children: [
    jsxs('div', { className:'flex justify-between', children: [
      jsx('span', { className:'text-xs font-medium', style:{color:'#d1d5db'}, children:label }),
      jsxs('span', { className:'text-xs tabular-nums font-bold', style:{color:c}, children:[pct,'%'] }),
    ] }),
    jsx(Bar, { pct, color:c }),
    reset > 0 && jsx('div', { className:'flex justify-between', children: jsx('span', { className:'text-[0.65rem]', style:{color:TEXT_DIM}, children:`${t('reset')}: ${t('resetFmt')(reset)}` }) }),
  ] })
}
function OgcCard({ data }) {
  if (data.error) return jsx('span', { className:'text-xs', style:{color:TEXT_DIM}, children:tErr(data.error) })
  return jsxs(Fragment, { children: [
    jsx(CycleRow, { label:t('cycle5h'), pct:data.rolling?.percent??0, reset:data.rolling?.reset_in }),
    jsx(CycleRow, { label:t('cycleWeek'), pct:data.weekly?.percent??0, reset:data.weekly?.reset_in }),
    jsx(CycleRow, { label:t('cycleMonth'), pct:data.monthly?.percent??0, reset:data.monthly?.reset_in }),
  ] })
}
function DsCard({ data }) {
  if (data.error) return jsx('span', { className:'text-xs', style:{color:TEXT_DIM}, children:tErr(data.error) })
  return jsxs('div', { className:'flex flex-col gap-1', children: [
    jsxs('div', { className:'flex justify-between items-center', children: [
      jsx('span', { className:'text-xs', style:{color:'#9ca3af'}, children:t('total') }),
      jsx('span', { className:'text-sm font-bold tabular-nums', style:{color:'#4D6BFE'}, children:fmtAmt(data.total, data.currency) }),
    ] }),
    data.granted !== '0.00' && jsxs('div', { className:'flex justify-between', children: [
      jsx('span', { className:'text-[0.65rem]', style:{color:TEXT_DIM}, children:t('granted') }),
      jsx('span', { className:'text-[0.65rem] tabular-nums', style:{color:TEXT_DIM}, children:fmtAmt(data.granted, data.currency) }),
    ] }),
    jsxs('div', { className:'flex justify-between', children: [
      jsx('span', { className:'text-[0.65rem]', style:{color:TEXT_DIM}, children:t('toppedUp') }),
      jsx('span', { className:'text-[0.65rem] tabular-nums', style:{color:TEXT_DIM}, children:fmtAmt(data.topped_up, data.currency) }),
    ] }),
  ] })
}
function GenericCard({ data, color }) {
  if (data.error) return jsx('span', { className:'text-xs', style:{color:TEXT_DIM}, children:tErr(data.error) })
  if (data.total != null) return jsxs('div', { className:'flex justify-between items-center', children: [
    jsx('span', { className:'text-xs', style:{color:'#9ca3af'}, children:t('balance') }),
    jsx('span', { className:'text-sm font-bold tabular-nums', style:{color}, children:fmtAmt(data.total, data.currency) }),
  ] })
  return jsx('span', { className:'text-xs', style:{color:TEXT_DIM}, children:JSON.stringify(data) })
}
const CARD_MAP = { deepseek:DsCard, opencode_go:OgcCard, openrouter:GenericCard, zhipu:GenericCard }
function ProviderCard({ id, data, color }) {
  const Card = CARD_MAP[id] || GenericCard
  return jsx(Card, { data, color })
}

/* --- Chip --- */
function QuotaChip() {
  const { data, isLoading } = useData()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const btnRef = useRef(null)
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!open) return
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h, true)
    return () => document.removeEventListener('mousedown', h, true)
  }, [open])

  /* Filter by enabled providers */
  const enabled = getEnabled()
  const allKeys = Object.keys(data || {}).filter(k => k !== 'updated_at')
  const keys = allKeys.filter(k => enabled[k])

  /* Compute per-provider alert colors */
  function getAlertColor(k, d) {
    if (d?.error) return null
    if (k === 'opencode_go' && (d.rolling?.percent >= 80 || d.weekly?.percent >= 80 || d.monthly?.percent >= 80)) {
      return '#ef4444' // red
    }
    if (k === 'deepseek' && parseFloat(d.total) <= 5) {
      return '#3b82f6' // blue
    }
    return null
  }

  const parts = keys.map(k => {
    const d = data[k]
    const color = getAlertColor(k, d)
    let text
    if (d.error) text = `${getProviderLabel(k)}: --`
    else if (d.monthly) text = `${getProviderLabel(k)}: ${d.monthly.percent}%`
    else if (d.total != null) text = `${getProviderLabel(k)}: ${fmtAmt(d.total, d.currency)}`
    else text = `${getProviderLabel(k)}: --`
    return { text, color }
  })
  const chipContent = isLoading
    ? t('title') + ' ...'
    : parts.length === 0 ? t('title') + ' --' : null

  function toggle() {
    if (!open && btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    haptic('tap'); setOpen(!open)
  }

  return jsxs('div', { className:'relative', ref, children: [
    jsx(Tip, { label:t('title'), children: jsx('button', {
      ref:btnRef,
      className:cn('inline-flex h-full items-center gap-1.5 px-2.5 text-xs transition-colors rounded min-w-[120px] hover:bg-(--chrome-action-hover)'),
      type:'button', style:{fontSize:'0.75rem',fontWeight:500}, onClick:toggle,
      children:jsx('span', { className:'tabular-nums whitespace-nowrap', children:
        chipContent !== null
          ? chipContent
          : parts.map((p, i) => jsxs(Fragment, { children: [
              i > 0 && jsx('span', { style:{color:TEXT_DIM}, children:' | ' }),
              jsx('span', { style: p.color ? {color:p.color} : undefined, children:p.text }),
            ] }, i))
      }),
    }) }),
    open && rect && jsx(Popover, { data, allKeys, onClose:()=>setOpen(false), rect }),
  ] })
}

/* --- Popover --- */
function Popover({ data, allKeys, onClose, rect }) {
  const [showSettings, setShowSettings] = useState(false)
  const [enabled, setEnabledState] = useState(getEnabled())
  const [lang, setLangState] = useState(getLang())

  function toggleProvider(id) {
    const next = { ...enabled, [id]: !enabled[id] }
    if (!next[id]) delete next[id]
    setEnabledState(next)
    setEnabled(next)
  }
  function toggleLang() {
    const next = lang === 'zh' ? 'en' : 'zh'
    setLangState(next)
    saveLang(next)
  }

  const displayKeys = showSettings ? allKeys : allKeys.filter(k => enabled[k])

  return jsx('div', {
    className:'fixed z-50',
    style:{bottom:`${window.innerHeight-rect.top+6}px`,right:`${window.innerWidth-rect.right}px`,width:300,borderRadius:10,border:`1px solid ${DIVIDER}`,background:'#0a0a0a',boxShadow:'0 12px 40px rgba(0,0,0,0.7)',padding:14,color:'#e5e7eb'},
    children:jsxs('div', { className:'flex flex-col gap-2', children: [
      /* Header */
      jsxs('div', { className:'flex items-center justify-between', children: [
        jsx('span', { className:'text-sm font-bold', style:{color:'#f3f4f6'}, children:t('title') }),
        jsxs('div', { className:'flex items-center gap-2', children: [
          jsx('button', { className:'text-xs hover:opacity-80 px-1.5 py-0.5 rounded', style:{color:TEXT_DIM,cursor:'pointer',border:`1px solid ${DIVIDER}`}, type:'button',
            onClick:toggleLang, children:t('langSwitch') }),
          jsx('button', { className:'text-sm hover:opacity-80', style:{color:showSettings?'#e879f9':TEXT_DIM,cursor:'pointer'}, type:'button',
            onClick:()=>setShowSettings(!showSettings), children:t('settings') }),
          jsx('button', { className:'text-sm hover:opacity-80', style:{color:TEXT_DIM,cursor:'pointer'}, type:'button',
            onClick:onClose, children:t('close') }),
        ] }),
      ] }),
      jsx('div', { style:{borderTop:`1px solid ${DIVIDER}`} }),

      /* Settings mode: checkboxes */
      showSettings
        ? jsxs('div', { className:'flex flex-col gap-1', children: [
            jsx('span', { className:'text-[0.65rem] font-medium', style:{color:TEXT_DIM}, children:t('settingsHint') }),
            ...allKeys.map(k => jsxs('label', {
              className:'flex items-center gap-2 py-1 cursor-pointer',
              children: [
                jsx('input', { type:'checkbox', checked:!!enabled[k], onChange:()=>toggleProvider(k),
                  style:{accentColor:getProviderColor(k)} }),
                jsx('span', { className:'text-xs', style:{color:'#d1d5db'}, children:getProviderLabel(k) }),
              ],
            }, k)),
          ] })

        /* Normal mode: provider cards */
        : displayKeys.length === 0
          ? jsx('span', { className:'text-xs text-center py-2', style:{color:TEXT_DIM},
              children:t('noProvider') })
          : displayKeys.map(k => {
              const color = getProviderColor(k)
              const logo = LOGOS[k]
              return jsxs(Fragment, { children: [
                jsxs('div', { className:'flex flex-col gap-1', children: [
                  logo
                    ? jsxs('div', { className:'flex items-center gap-2', children: [
                        jsx('img', { src:logo, width:20, height:20, style:{borderRadius:3}, alt:getProviderLabel(k) }),
                        jsx('span', { className:'text-sm font-extrabold uppercase tracking-wide', style:{color}, children:getProviderLabel(k) }),
                      ] })
                    : jsxs('div', { className:'flex items-center gap-2', children: [
                        jsx('div', { style:{width:20,height:20,borderRadius:4,background:color} }),
                        jsx('span', { className:'text-sm font-extrabold uppercase tracking-wide', style:{color}, children:getProviderLabel(k) }),
                      ] }),
                  jsx(ProviderCard, { id:k, data:data[k], color }),
                ] }),
                jsx('div', { style:{borderTop:`1px solid ${DIVIDER}`} }),
              ] }, k)
            }),

      /* Footer */
      jsx('div', { className:'flex justify-end', children: jsx('span', { className:'text-[0.6rem]', style:{color:'#4b5563'},
        children:data?.updated_at ? `${t('updated')}: ${new Date(data.updated_at).toLocaleTimeString(_lang === 'zh' ? 'zh-CN' : 'en-US')}` : '' }) }),
    ] }),
  })
}

/* --- Plugin export --- */
function makePlugin(id, name, apiBase) {
  _apiBase = apiBase
  return {
    id, name, defaultEnabled: false,
    register(context) {
      _ctx = context
      context.register({ id:'chip-'+id, area:'statusBar.right', order:150, render:()=>jsx(QuotaChip,{}) })
    },
  }
}

export default makePlugin('quota-monitor', 'Quota Monitor', '/api/plugins/quota-monitor')
