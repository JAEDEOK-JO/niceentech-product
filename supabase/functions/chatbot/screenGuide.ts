import { tableColumns } from './tableColumns.ts'

const labels: Record<string, string> = {
  attendance_annual_quota: '근태관리 연차 일수',
  attendance_logs: '근태관리 출퇴근',
  attendance_request_notifications: '근태 알림',
  attendance_requests: '근태관리 휴가 신청',
  chat_messages: '메신저 메시지',
  chat_room_members: '메신저 참여자',
  chat_room_reads: '메신저 읽음',
  chat_rooms: '메신저 방',
  chat_scheduled_messages: '메신저 예약 메시지',
  cnc_items: 'CNC',
  company_fitting_types: '회사 부속 규격',
  company_list: '회사리스트',
  company_pipe_types: '회사 파이프 규격',
  daily_work_hours: '근태관리 근무시간',
  department_metric_definitions: '부서 지표 정의',
  department_metric_entries: '부서 지표',
  drawing_file_history: '도면 파일 이력',
  drawing_pdf: '도면 파일',
  drawing_quantity_runs: '도면 수량 분석',
  drawing_quantity_tasks: '도면 수량 분석 작업',
  drawing_telegram_notifications: '도면 알림 발송',
  employee_option_settings: '직원 옵션',
  employees: '근태관리 직원',
  fitting_types: '부속 규격',
  inventory_company_material_items: '입출고 회사 자재',
  inventory_material_items: '입출고 자재',
  inventory_transaction_items: '입출고 상세',
  inventory_transactions: '입출고내역',
  inventory_transactions_fitting: '입출고 부속',
  inventory_transactions_pipe: '입출고 파이프',
  issued_transaction_statements: '출하명세서',
  maker_catalog: '메이커 목록',
  notifications: '알림',
  outsourcing_company: '외주 업체',
  outsourcing_management: '외주 관리',
  pipe_types: '파이프 규격',
  process_issue_request_feedbacks: '공정 이슈 답변',
  process_issue_request_notifications: '공정 이슈 알림',
  process_issue_requests: '공정 이슈',
  product_list: '생산계획표',
  product_list_daily_heads: '생산 일일 헤드',
  product_list_daily_process_heads: '생산 공정 일일 헤드',
  product_list_process_time_calcs: '공정 시간 계산',
  product_list_test: '생산계획 테스트',
  product_list_time_calcs: '생산 시간 계산',
  production_line_overtime_logs: '라인 잔업',
  production_overtime_logs: '잔업',
  production_repair_history: '설비 수리',
  productlist_checks: '생산 확인',
  profiles: '사용자',
  quality_list: '검수리스트',
  quality_list_info: '검수 로트 정보',
  quality_merge_backups: '검수 병합 백업',
  sales_as_entries: '보고서 AS',
  sales_weekly_entries: '보고서 주간 실적',
  setting: '설정',
  setting_updates: '업데이트 내역',
  shipment_schedule: '출하일정',
  time_calc_settings: '시간 계산 설정',
  unit_price_ranges: '단가',
  welding_inspections: '용접일정',
  welding_issues: '용접 이슈',
}

export function screenLabel(table: string) {
  return labels[table] ?? ''
}

export function screenGuide() {
  return `화면
생산계획표, 검수리스트, 용접일정, 출하일정, 출하명세서, 입출고내역, 회사리스트, 근태관리, 메신저, 보고서, 외주, CNC 를 조회할 수 있다.
뭘 조회할 수 있는지 물으면 sql 은 빈 문자열이고 reply 에 이 화면 이름을 넣는다.
직원 비밀번호, 푸시 토큰, 푸시 설정, 챗봇 대화는 조회할 수 없다. 그 질문이면 sql 은 빈 문자열이고 reply 는 조회할 수 없습니다.

건수를 세는 기준
- 생산계획 전체 건수, 생산계획표 전체, 전체 몇 건은 줄 수가 아니다. hold 가 참이 아닌 product_list 의 head, hole, groove 를 각각 sum 해서 헤드, 홀, 그루브로 답한다. count 로 줄 수를 건수라고 답하지 않는다.
- 헤드만, 홀만, 그루브만, 중량만 물으면 그 항목만 sum 한다.
- 몇 줄, 구역 몇 개, 리스트 몇 개라고 물을 때만 count 를 쓰고 결과는 구역이라고 부른다.
- 검수 증지, 증지 수량, 검수 합계는 quality_list 의 "totalH" 를 sum 한다. 화면 증지는 a32 a40 a50 a65 m65 m80 m100 m125 m150 m200 이다.
- 근태에서 연차 몇 번은 attendance_requests 다. user_name 으로 사람을 찾고 leave_type 이 연차, 반차(오전), 반차(오후) 인 신청 건수를 센다. 종류와 status 를 함께 말한다. 이번 달은 start_date 와 end_date 가 그 달과 겹치는 신청이다. status 가 반려인 것은 뺀다. 연차 잔여와 총일수는 attendance_annual_quota 의 total_days, used_days 와 employees 의 remaining_annual_leave_count 다.
- 출퇴근은 attendance_logs 의 raw_name, work_date, clock_in, clock_out 이다.
- 회사는 company_list, 출하일정은 shipment_schedule, 출하명세서는 issued_transaction_statements, 입출고는 inventory_transactions 와 inventory_transactions_pipe, inventory_transactions_fitting, 용접일정은 welding_inspections 와 product_list 의 welding_schedule_date, 메신저는 chat_rooms 와 chat_messages 다.
- 날짜가 없고 전체라고 하면 날짜 조건을 넣지 않는다.
- 대소문자가 섞인 컬럼은 큰따옴표로 감싼다.
- 답과 생각에는 화면 이름만 쓴다.

자료
${Object.entries(tableColumns)
  .map(([name, columns]) => `${labels[name] ?? name} ${name}: ${columns}`)
  .join('\n')}`
}
