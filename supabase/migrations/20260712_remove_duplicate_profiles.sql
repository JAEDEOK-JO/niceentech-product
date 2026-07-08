-- 중복 프로필 정리: 최근 로그인 계정만 유지
-- 삭제: 조재덕 test10@niceentech.kr, 이지형 niceen8@niceentech.kr
-- 유지: 조재덕 duko777@niceentech.kr, 이지형 niceen01@niceentech.kr

UPDATE public.process_issue_requests SET requester_user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE requester_user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.process_issue_requests SET requester_user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE requester_user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.process_issue_requests SET assigned_user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE assigned_user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.process_issue_requests SET assigned_user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE assigned_user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.process_issue_requests SET resolved_by_user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE resolved_by_user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.process_issue_requests SET resolved_by_user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE resolved_by_user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.process_issue_request_notifications SET recipient_user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE recipient_user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.process_issue_request_notifications SET recipient_user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE recipient_user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.process_issue_request_feedbacks SET author_user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE author_user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.process_issue_request_feedbacks SET author_user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE author_user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.sales_as_entries SET created_by = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE created_by = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.sales_as_entries SET created_by = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE created_by = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.sales_weekly_entries SET created_by = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE created_by = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.sales_weekly_entries SET created_by = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE created_by = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.department_metric_entries SET created_by = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE created_by = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.department_metric_entries SET created_by = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE created_by = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.inventory_transactions SET created_by = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE created_by = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.inventory_transactions SET created_by = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE created_by = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.inventory_transactions_pipe SET user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.inventory_transactions_pipe SET user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.inventory_transactions_fitting SET user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.inventory_transactions_fitting SET user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.shipment_schedule SET manager_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE manager_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.shipment_schedule SET manager_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE manager_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.company_list SET manager_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE manager_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.company_list SET manager_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE manager_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.cnc_items SET created_by = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE created_by = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.cnc_items SET created_by = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE created_by = '666a112d-2c35-4e44-bc40-dc0f357ae126';
UPDATE public.chat_room_reads SET user_id = 'ae99d94a-8e81-4794-8783-978525ed3cdd' WHERE user_id = '23afb879-650b-4c2b-8821-e5a2f4f2854b';
UPDATE public.chat_room_reads SET user_id = 'bd557700-dfac-4691-bec8-53e598fbf25a' WHERE user_id = '666a112d-2c35-4e44-bc40-dc0f357ae126';
DELETE FROM public.push_subscriptions WHERE user_id IN ('23afb879-650b-4c2b-8821-e5a2f4f2854b', '666a112d-2c35-4e44-bc40-dc0f357ae126');

DELETE FROM auth.users
WHERE id IN (
  '23afb879-650b-4c2b-8821-e5a2f4f2854b',
  '666a112d-2c35-4e44-bc40-dc0f357ae126'
);
