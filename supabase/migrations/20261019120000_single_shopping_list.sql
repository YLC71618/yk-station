-- One shared shopping list instead of 買菜 / 日用品 (Yoyo's request).
update public.shopping_items set list = 'grocery' where list <> 'grocery';
alter table public.shopping_items alter column list set default 'grocery';
alter table public.shopping_items drop constraint if exists shopping_items_list_check;
alter table public.shopping_items add constraint shopping_items_list_check check (list = 'grocery');
