-- 루틴보드 — 제거(언인스톨) 스크립트
-- 이 모듈의 테이블만 삭제합니다. 접두사가 모듈마다 고유하므로
-- 같은 Supabase 프로젝트에 다른 모듈을 함께 설치했더라도 그 데이터에는 영향이 없습니다.
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체를 붙여넣고 Run 하세요.

drop table if exists rb_retro_items cascade;
drop table if exists rb_risks cascade;
drop table if exists rb_tasks cascade;
drop table if exists rb_reports cascade;
drop table if exists rb_routines cascade;
