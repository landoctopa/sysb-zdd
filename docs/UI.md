# Updating App UI
I want to update my frontend ui. It is for a sales platform for solopreneurs and small businesses. 

## Instructions
As a expert frontend engineer Can you go over the code and help me make it more professional, modern and sleek, I have also attached my global.css file. I will give you one or more files page/component code in a related group, please help me enhance and standardize ui across all the files. 
- I will provide page and component code by feature/route. Lets address related code together.
- Follw the rules fr UI stated belw yu can make new recmmendatins as well befre implementation
- Right now the page copy specially titles seem too cheesy make them more professional
- main top navigation menu is also missing which we ned to implement

## Rules for UI
Here are few things that the UI should do -> 

1. Layout: 
    - Be responsive and work well on all devices. 
    - Create a container component for page that would be used in every page.
    - use tailwind container classes for width
2. UI Organization:
    - Elements should always be in signle column for mobile devices but we can have two columns on larger screens
    - Data dense elements: on smaller screen you can hide some less critical information.
3. Optimize text sections for readability and action. 
4. Theme: 
    - Modern Deep Space (Dark Theme)
        - Background: #0a192f (Deep Navy)
        - Surface: #172a45 (Lighter Navy)
        - Primary Accent: #64ffda (Teal/Cyan)
        - Text: #ccd6f6 (Light Gray)
        - Complementary: #8892b0 (Cool Gray)
5. Important: Do not change other code or logic in the file just the UI. 
6. Ask me for clarifications.  

## Stack
- nextjs
- tailwindcss v4
- shadcn

## App structure
### Routes
- /app
    - /api - all api endpoints
    - / signals - raw news and feeds which could be a potential lead for user
        - /page.tsx - all signals
        - /SignalsClient.tsx
        - /[id] - lead details
            - /page.tsx - lead detail with AI research, action to add signal as lead
            - DossierClient.tsx - Component for managing signals
    - /leads - users manage leads they have added
        - /page.tsx - all leads
        - /PipelineView.tsx to show all leads by stages
        - /[id] - Lead work area
            - /page.tsx
            - /ActivityFeed.tsx
            - /AICoachSection.tsx
            - /ContactsManager.tsx
            - /StrategyCard.tsx
            - /WorkbenchHeader.tsx
    - /auth
    - /login
        - /page.tsx
    - /register
        - /page.tsx
    - /settings
        - /page.tsx
    - /onboarding
        - /page.tsx
    - /layout.tsx

    ## Order of implementation
    - Base: /layout.tsx, /page.tsx, gloval.css
    - Signals route
    - leads route
    - profile, settings route
    - auth route



        