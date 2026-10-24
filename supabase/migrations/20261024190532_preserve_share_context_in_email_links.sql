begin;
-- Keep the existing Resend message and delivery flow; carry its sender context in the product URL.
CREATE OR REPLACE FUNCTION public.get_crew_prize_share_email_payload(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'recipientId',s.recipient_id,
    'senderName',coalesce(nullif(btrim(p.display_name),''),nullif(btrim(p.legal_first_name),''),'A Crew member'),
    'title',o.title,
    'slug',s.offering_slug,
    'shareToken',(select l.token from public.product_share_links l where l.owner_id=s.sender_id and l.offering_slug=s.offering_slug and l.scope_key='crew'),
    'eligible',s.status='processing' and u.email is not null and u.email_confirmed_at is not null
      and exists(select 1 from public.crew_invitations c where c.status='accepted' and
        ((c.requester_id=s.sender_id and c.recipient_id=s.recipient_id) or
         (c.recipient_id=s.sender_id and c.requester_id=s.recipient_id)))
  )
  from public.crew_prize_share_emails s
  join demo_private.preview_entry_offerings o on o.slug=s.offering_slug
  left join public.customer_profiles p on p.customer_id=s.sender_id
  left join auth.users u on u.id=s.recipient_id
  where s.id=p_id and s.status='processing';
$function$
;
notify pgrst,'reload schema';
commit;
