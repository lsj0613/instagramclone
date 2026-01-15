import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind 클래스들을 병합하는 유틸리티 함수
 * 1. clsx를 통해 조건부 클래스를 처리하고
 * 2. twMerge를 통해 중복되거나 충돌하는 Tailwind 클래스를 최적화함
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}