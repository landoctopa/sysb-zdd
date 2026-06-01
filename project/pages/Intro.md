# Current Work

We are currently working on lead management feature /leads/[id]/page.tsx
- We are orchestrating leads through different stages, stage and related task are defined in lib/iris/playbook.config.ts and handle through main orchestrater component app/leads/[id]/LeadWorkbenchClient.tsx.
- Each stage has its own component which has children widgets which are planned based on the playbook. 
- We have to work on discover stage and task {id: 'send_first_outreach',order: 4}
- I will upload relevant files
- AI integration- AI orchestrator (iris) is connected to the playbook and use predefined skills in /lib/skills to call api endpoint api/iris/generate/route.ts
- I have also attached files from previous task for you to get an idea about styling and approach
- Ask me if you need to see any code or file