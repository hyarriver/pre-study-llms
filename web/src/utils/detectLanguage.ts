/**
 * 代码语言检测工具
 */

/**
 * 从代码内容或元数据中检测编程语言
 */
export function detectLanguage(
  code: string,
  metadata?: Record<string, any>
): string {
  // 优先从 metadata 获取
  if (metadata?.language) {
    return metadata.language
  }

  // 从代码内容推断
  const firstLine = code.trim().split('\n')[0] || ''

  // 检查常见的语言标识
  if (firstLine.includes('#!/usr/bin/env python') || firstLine.includes('#!/usr/bin/python')) {
    return 'python'
  }
  if (firstLine.includes('#!/bin/bash') || firstLine.includes('#!/bin/sh')) {
    return 'bash'
  }
  if (firstLine.includes('#!/usr/bin/env node')) {
    return 'javascript'
  }
  if (code.includes('import torch') || code.includes('import tensorflow')) {
    return 'python'
  }
  if (code.includes('import numpy') || code.includes('import pandas')) {
    return 'python'
  }
  if (code.includes('console.log') || code.includes('function')) {
    return 'javascript'
  }
  if (code.includes('def ') && code.includes('import ')) {
    return 'python'
  }
  if (code.includes('class ') && code.includes('public ')) {
    return 'java'
  }
  if (code.includes('#include')) {
    return 'cpp'
  }
  if (code.includes('package ') && code.includes('import ')) {
    return 'go'
  }

  // 默认返回 python（因为主要是 Python 教程）
  return 'python'
}
