const AMOUNT = 2000

function photo(color, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="54%" fill="#ffffff" font-size="42" font-family="sans-serif" text-anchor="middle">${label}</text></svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

const normal = photo('#64748b', '정상')
const problem = photo('#334155', '문제')

function report(id, userId, name, department, createdAt, foundNote, normalUrls, problemUrls) {
  return {
    id,
    user_id: userId,
    name,
    department,
    status: '승인',
    amount: AMOUNT,
    found_note: foundNote,
    original_note: '',
    created_at: createdAt,
    normalPhotoUrls: normalUrls,
    problemPhotoUrls: problemUrls,
  }
}

export const rewardDummyReports = [
  report('dummy-park-1', 'dummy-park', '박민수', '용접부', '2026-11-15T09:20:00+09:00', '비드 끊김', [], [problem, problem]),
  report('dummy-park-2', 'dummy-park', '박민수', '용접부', '2026-11-14T16:40:00+09:00', '엘보 방향 반대', [normal], [problem]),
  report('dummy-park-3', 'dummy-park', '박민수', '용접부', '2026-11-13T11:10:00+09:00', '가접 누락', [], [problem]),
  report('dummy-park-4', 'dummy-park', '박민수', '용접부', '2026-11-12T15:05:00+09:00', '하단 용접 불량', [normal, normal], [problem, problem, problem]),
  report('dummy-choi-1', 'dummy-choi', '최수진', '생산부', '2026-11-14T10:15:00+09:00', '치수 오차', [], [problem, problem]),
  report('dummy-choi-2', 'dummy-choi', '최수진', '생산부', '2026-11-11T13:30:00+09:00', '표면 스크래치', [normal], []),
  report('dummy-jung-1', 'dummy-jung', '정하늘', 'CNC', '2026-11-10T09:45:00+09:00', '홀 위치 불량', [], [problem]),
]

export function mergeRewardDummy(items) {
  return [...rewardDummyReports, ...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}
