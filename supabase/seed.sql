insert into public.employee_templates (id,name,role_name,department,industry,description,skills,default_tools,default_permissions,default_instructions,monthly_price,published) values
('10000000-0000-0000-0000-000000000001','Ana','Financeiro Digital','Financeiro',null,'Mantém o caixa sob controle, encontra riscos e prepara ações financeiras.','["Fluxo de caixa","Contas a pagar","Cobranças"]','["consult_accounts","generate_collection"]','{"generate_collection":"approval_required"}','Analise com cuidado, explique anomalias e nunca envie cobranças sem aprovação.',149,true),
('10000000-0000-0000-0000-000000000002','Carlos','Comprador Digital','Compras',null,'Compara fornecedores e prepara recomendações de compra.','["Cotações","Fornecedores","Negociação"]','["consult_suppliers","compare_proposals"]','{"purchase":"approval_required"}','Priorize custo total, prazo e risco. Nunca conclua compras sem aprovação.',99,true),
('10000000-0000-0000-0000-000000000003','Sofia','Atendimento Digital','Atendimento',null,'Organiza solicitações e resolve dúvidas simples.','["Triagem","Atendimento","FAQs"]','["list_customers","send_message"]','{"send_message":"scoped"}','Se houver risco ou ambiguidade, encaminhe para uma pessoa.',99,true),
('10000000-0000-0000-0000-000000000004','Júlia','Marketing Digital','Marketing',null,'Cria pautas, campanhas e calendários.','["Conteúdo","Campanhas","Revisão"]','["create_content","create_event"]','{"publish":"approval_required"}','Mantenha o tom da marca e nunca publique sem aprovação.',99,true),
('10000000-0000-0000-0000-000000000005','Lucas','Comercial Digital','Comercial',null,'Qualifica oportunidades e mantém o funil ativo.','["Leads","Follow-up","Funil"]','["list_customers","send_message"]','{"send_proposal":"approval_required"}','Seja objetivo e registre cada contato no histórico.',119,true)
on conflict (id) do nothing;

insert into public.tools (key,name,description,category,configuration_schema) values
('consult_accounts','Consultar contas','Consulta contas a pagar e receber.','Financeiro','{"type":"object"}'),
('generate_collection','Gerar cobrança','Prepara cobrança para aprovação e envio.','Financeiro','{"type":"object"}'),
('consult_suppliers','Consultar fornecedores','Busca fornecedores habilitados.','Compras','{"type":"object"}'),
('compare_proposals','Comparar propostas','Compara preço, prazo e condições.','Compras','{"type":"object"}'),
('list_customers','Listar clientes','Consulta clientes no escopo autorizado.','CRM','{"type":"object"}'),
('send_message','Enviar mensagem','Envia mensagem após aplicar políticas.','Comunicação','{"type":"object"}'),
('create_content','Criar conteúdo','Prepara uma peça de conteúdo.','Marketing','{"type":"object"}'),
('create_event','Criar evento','Cria compromisso no calendário.','Produtividade','{"type":"object"}'),
('consult_documents','Consultar documentos','Busca documentos autorizados.','Arquivos','{"type":"object"}')
on conflict (key) do nothing;

insert into public.organizations (id,name,slug,industry,size,owner_id) values
('20000000-0000-0000-0000-000000000001','Construtora Alpha','construtora-alpha','Construção civil','11-50','30000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;
insert into public.organization_members (organization_id,user_id,role,permissions) values
('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','owner','{"all":true}')
on conflict (organization_id,user_id) do nothing;

insert into public.digital_employees (id,organization_id,template_id,name,role_name,department,seniority,description,status,monthly_price,configuration) values
('40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Ana','Financeiro Digital','Financeiro','Especialista','Mantém o caixa sob controle e prepara decisões financeiras.','aguardando_aprovacao',149,'{"performance":96,"brainKey":"ana-financeiro"}'),
('40000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','Carlos','Comprador Digital','Compras','Pleno','Compara fornecedores e recomenda compras.','trabalhando',99,'{"performance":92,"brainKey":"carlos-compras"}'),
('40000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','Sofia','Atendimento Digital','Atendimento','Pleno','Organiza e atende solicitações.','trabalhando',99,'{"performance":95,"brainKey":"sofia-atendimento"}'),
('40000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000004','Júlia','Marketing Digital','Marketing','Pleno','Prepara conteúdo e campanhas.','disponivel',99,'{"performance":90,"brainKey":"julia-marketing"}'),
('40000000-0000-0000-0000-000000000005','20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000005','Lucas','Comercial Digital','Comercial','Pleno','Qualifica oportunidades e mantém o funil ativo.','disponivel',119,'{"performance":93,"brainKey":"lucas-comercial"}')
on conflict (id) do nothing;

insert into public.tasks (id,organization_id,employee_id,title,description,priority,status,due_at,requires_approval,created_by,input_data,output_data,started_at) values
('50000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Analisar vencimentos dos próximos 7 dias','Analise contas e prepare cobranças para clientes atrasados.','alta','aguardando_aprovacao',now()+interval '7 hours',true,'30000000-0000-0000-0000-000000000001','{"window_days":7}','{"accounts":12,"overdue_customers":3,"collection_total":18740}',now()-interval '1 hour'),
('50000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','Cotar materiais da obra Pinheiros','Comparar preço e prazo de três fornecedores.','alta','executando',now()+interval '1 day',true,'30000000-0000-0000-0000-000000000001','{}',null,now()-interval '40 minutes')
on conflict (id) do nothing;
insert into public.approvals (id,organization_id,task_id,employee_id,action_type,title,description,impact,risk_level,payload) values
('60000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','send_collection','Enviar 3 cobranças','Cobranças preparadas para clientes vencidos.','Recuperação potencial de R$ 18.740.','medio','{"total":18740,"customers":3}'),
('60000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','40000000-0000-0000-0000-000000000002','select_supplier','Confirmar fornecedor recomendado','Selecionar a proposta de melhor custo-benefício.','Economia prevista de R$ 2.340.','medio','{"total":28650}')
on conflict (id) do nothing;
insert into public.activities (organization_id,employee_id,task_id,activity_type,title,description,created_at) values
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','tool','Contas consultadas','12 vencimentos classificados por data, valor e risco.',now()-interval '50 minutes'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','approval','Cobranças preparadas','3 cobranças aguardam aprovação humana.',now()-interval '35 minutes'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000002','collaboration','Orçamento confirmado','Ana validou orçamento para a compra de Carlos.',now()-interval '20 minutes');

insert into public.employee_autonomy_policies (organization_id,employee_id,action_key,action_label,mode,limits,notes) values
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','analyze_movements','Analisar movimentações','autonomous','["Sem limite monetário"]','Leitura e diagnóstico podem acontecer sem revisão humana.'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','send_collection','Enviar cobrança','autonomous','["Até R$ 500,00"]','Cobranças maiores sobem para aprovação.'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','execute_payment','Realizar pagamentos','blocked','["Bloqueado"]','Pagamentos permanecem bloqueados.'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','compare_proposals','Comparar propostas','autonomous','["Sem limite monetário"]','Comparação é observacional.'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','place_order','Emitir pedido','approval_required','["Somente com aprovação"]','Pedidos precisam de validação.'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','respond_simple','Responder dúvidas simples','autonomous','["FAQ e mensagens recorrentes"]','Mensagens comuns podem sair automaticamente.'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','publish_campaign','Publicar campanha','approval_required','["Somente com aprovação"]','Publicações precisam de revisão.'),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005','send_proposal','Enviar proposta','approval_required','["Somente com aprovação"]','Propostas comerciais seguem revisão.');

insert into public.employee_metrics (organization_id,employee_id,period_type,period_start,period_end,tasks_executed,money_saved,revenue_generated,time_saved_minutes,issues_found,risk_prevented,pending_approvals) values
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','week',current_date-7,current_date,23,4280,0,372,3,4,1),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000002','week',current_date-7,current_date,11,1260,0,188,1,2,1),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000003','week',current_date-7,current_date,18,0,0,144,0,0,0),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004','week',current_date-7,current_date,9,0,1840,96,1,1,0),
('20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005','week',current_date-7,current_date,14,0,2140,114,1,1,0);

insert into public.crew_briefings (id,organization_id,period_type,period_start,period_end,title,summary,status,created_by) values
('80000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','week',current_date-7,current_date,'Briefing semanal da Crew','Sua crew analisou a última semana e priorizou recuperação de caixa, leads sem retorno e revisão da campanha B.','published','30000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.briefing_items (briefing_id,employee_id,item_order,headline,message,metrics,tone) values
('80000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001',1,'Financeiro','Recebemos R$31.400 e existem R$7.800 em aberto. Duas despesas acima do padrão foram sinalizadas.','{"money_saved":4280,"pending_approvals":1}','warning'),
('80000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000005',2,'Comercial','Entraram 42 oportunidades. 11 têm alta intenção e 4 clientes importantes ainda não retornaram.','{"tasks_executed":14,"risk_prevented":1}','warning'),
('80000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000004',3,'Marketing','Investimos R$1.840 e geramos 38 leads. A campanha B ficou 31% acima da média.','{"revenue_generated":1840,"tasks_executed":9}','positive');
insert into public.conversations (id,organization_id,employee_id,title) values
('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','Financeiro da semana')
on conflict (id) do nothing;
insert into public.messages (conversation_id,sender_type,sender_id,content) values
('70000000-0000-0000-0000-000000000001','employee','40000000-0000-0000-0000-000000000001','Bom dia, Vitor. As cobranças estão prontas e aguardam sua aprovação.');
insert into public.subscriptions (organization_id,plan,included_employees,additional_employees,base_price,additional_price,status,current_period_start,current_period_end) values
('20000000-0000-0000-0000-000000000001','crew_starter',3,2,299,99,'active',date_trunc('month',now()),date_trunc('month',now())+interval '1 month')
on conflict (organization_id) do nothing;

insert into public.financial_accounts (organization_id,external_id,customer_name,document,amount,due_date,direction,status,source) values
('20000000-0000-0000-0000-000000000001','REC-001','Incorporadora Vale','NF-1042',8200,current_date-2,'receivable','overdue','seed'),
('20000000-0000-0000-0000-000000000001','REC-002','Residencial Aurora','NF-1055',5940,current_date-5,'receivable','overdue','seed'),
('20000000-0000-0000-0000-000000000001','REC-003','Obras Monte Azul','NF-1061',4600,current_date-8,'receivable','overdue','seed'),
('20000000-0000-0000-0000-000000000001','REC-004','Construtora Pátio','NF-1070',12900,current_date+3,'receivable','open','seed'),
('20000000-0000-0000-0000-000000000001','REC-005','Edifício Horizonte','NF-1080',17600,current_date+5,'receivable','open','seed')
on conflict (organization_id,source,external_id) do nothing;
