-- Keep saved activity and catalog pages consistent. Only the duplicated display
-- title changes; the offer identity, retailer, capacity and financial data stay.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

update demo_private.preview_entry_offerings
set title = '$100 Apple Gift Card'
where slug = 'directory-apple-gift-card-100-gift-card'
  and title = '$100 Apple Gift Card Gift Card';

commit;
