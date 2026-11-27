import { ref } from 'vue'

// 부서별로 선택한 주를 기억해, 탭을 옮기거나 일괄출력해도 같은 주를 보여준다.
const states = new Map()

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function getReportWeekState(department) {
  if (!states.has(department)) {
    states.set(department, { weeksAgo: ref(0), page: ref(1), salesWeek: ref(null) })
  }
  return states.get(department)
}

// anchorDate 는 오늘에서 선택한 주만큼 앞선 같은 요일이다.
// periodEnd 와 workEnd 는 이번 주면 오늘, 지난 주면 그 주 일요일과 토요일이다.
export function resolveReportWeek(weeksAgo, today = new Date()) {
  const base = startOfDay(today)
  const anchorDate = addDays(base, -7 * weeksAgo)
  const monday = addDays(anchorDate, -((anchorDate.getDay() + 6) % 7))
  const isPastWeek = weeksAgo > 0
  return {
    isPastWeek,
    anchorDate,
    monday,
    periodEnd: isPastWeek ? addDays(monday, 6) : base,
    workEnd: isPastWeek ? addDays(monday, 5) : base,
  }
}

// 값은 화면을 만들 때 한 번 정해진다. 주를 바꾸면 부모가 key 로 화면을 다시 만든다.
export function useReportWeek(department) {
  const { weeksAgo, page } = getReportWeekState(department)
  return {
    ...resolveReportWeek(weeksAgo.value),
    page,
    showPreviousWeek: () => {
      weeksAgo.value += 1
    },
    showThisWeek: () => {
      weeksAgo.value = 0
    },
    showNextWeek: () => {
      weeksAgo.value = Math.max(0, weeksAgo.value - 1)
    },
  }
}
