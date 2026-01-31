/**
 * 代码语言检测工具
 * 支持 python、javascript、typescript、markdown、bash、java、go、cpp 等
 */

function getLanguageFromMetadata(metadata?: Record<string, any>): string | null {
  if (!metadata) return null
  if (typeof metadata.language === 'string' && metadata.language) {
    return normalizeLang(metadata.language)
  }
  const info = metadata.language_info
  if (info && typeof info.name === 'string') return normalizeLang(info.name)
  const kern = metadata.kernelspec
  if (kern && typeof kern.language === 'string') return normalizeLang(kern.language)
  return null
}

function normalizeLang(lang: string): string {
  const s = (lang || '').toLowerCase().trim()
  const map: Record<string, string> = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    md: 'markdown',
    sh: 'bash',
    shell: 'bash',
    node: 'javascript',
  }
  return map[s] || s || 'python'
}

/**
 * 从代码内容或元数据中检测编程语言
 */
export function detectLanguage(
  code: string,
  metadata?: Record<string, any>
): string {
  const fromMeta = getLanguageFromMetadata(metadata)
  if (fromMeta) return fromMeta

  const trimmed = code.trim()
  const firstLine = trimmed.split('\n')[0] || ''

  // Shebang / 常见语言标识
  if (firstLine.includes('#!/usr/bin/env python') || firstLine.includes('#!/usr/bin/python')) return 'python'
  if (firstLine.includes('#!/bin/bash') || firstLine.includes('#!/bin/sh')) return 'bash'
  if (firstLine.includes('#!/usr/bin/env node') || firstLine.includes('#!/usr/bin/node')) return 'javascript'

  // 典型 import/require 与语法特征
  if (/import\s+(torch|tensorflow|numpy|pandas|sklearn)/.test(code) || (code.includes('def ') && /import\s+/.test(code))) return 'python'
  if (code.includes('console.log') || code.includes('require(') || code.includes('module.exports')) return 'javascript'
  if (code.includes('interface ') && code.includes(': ') && (code.includes('=>') || code.includes('function'))) return 'typescript'
  if (/^#+\s|^\-+\s|^\*\s|^>\s|\[.+\]\(.+\)/.test(trimmed) || (trimmed.includes('\n') && /^#+\s/m.test(trimmed))) return 'markdown'
  if (code.includes('class ') && (code.includes('public ') || code.includes('private ') || code.includes('void '))) return 'java'
  if (code.includes('#include') && (code.includes('std::') || code.includes('int main'))) return 'cpp'
  if (code.includes('package main') || (code.includes('package ') && code.includes('import "'))) return 'go'
  if (code.includes('func ') && code.includes('package ')) return 'go'
  if (code.includes('<?php') || code.includes('$_')) return 'php'
  if (code.includes('require ') && code.includes('end')) return 'ruby'
  if (code.includes('fn ') && code.includes('let ') && code.includes('::')) return 'rust'

  return 'python'
}
