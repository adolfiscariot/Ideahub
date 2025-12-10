# Primary Colors

#ee82ee

rgba(238, 130, 238)


#800080

rgba(128, 0, 128)


#000000

rgba(0, 0, 0)

# Auth

- Have user friendly errors on the authentication part for the user like invalid password your password must contain or even like a checkbox for their password on register

# Token refresh

- Either show and tell the user their session has expired and they should log out after a reasonable amount of time or automatically refresh their token through that endpoint confirm what the endpoint was for

# Missing Backend Endpoints 

- get-requests
- reject-requests
- leave-group

# Ideas tab checklist

## DONE

- IDEA CREATION

- IDEA VIEWING

- FIXED FIGURE OR NUMBER OF WORDS FOR TITLE AND DESCRIPTION - DONE

- REMOVE IDEA COMMENTS

- REMOVE THE ANONYMOUS LOGO - ITS REPETITIVE

- Increase margins for Idea page too

- IDEA OPENING AND VIEWING - window to the right - change that window and have the split page one - This should call the open idea endpoint i think or believe

- HAVE THE SHARE IDEA AS A POPUP MODAL NOT AN INLINE THING 

- SHOW THE CHAR NUMBER FOR TITLE AND DESCRIPTION IN THE SHARE IDEA FORM 

- IDEA DATE FIX 

- IDEA DELETION - connect to endpoint

## TO BE DONE

- Remove Console logs when completely done with ideas 

- Update Idea - connect to endpoint

- Viewing endpoint - connect to it - although i dont think its really necessary when we are on the ideas page since frontend handles that already

- Pagination

- Member fetching for this particular group and also display when that member thing is clicked also the member count

- Vote on Ideas connect to backend endpoints

- Small UI touch up

- IF admin for the group show a promote button it should be like left click and get options that should show the admin the promote idea option - think about this... 

**Considerations for the Idea opening and viewing popup**

OR INSTEAD OF A POPUP HAVE THE PAGE DIVIDED INTO THREE SECTIONS: MEMBERS ON THEFAR LEFT (COLLAPSIBLE), IN THE MIDDLE IDEAS, IN THE FAR LET WHEN A USER CLICKS ON AN IDEA IT JUST DISPLAYS THAT IDEA IN THIS FAR LEFT SECTION

THINK OF A WAY THAT DOES NOT HAVE A POPUP, HAVING A POPUP SOUNDS TOO EXHAUSTING TO THE USER CLICK IDEA VIEW CLOSE CLICK ANOTHER ONE CLOSE YEAH I DONT WANT THAT 

## NICE TO HAVE

- IDEA DISPLAY UI - SORT OF LIKE A STICKY NOTE SITUATION - YEAH SOMETHING RETRO - THINK ABOUT IT - INSTEAD OF GENERIC CARD STACKING

- POSSIBLY HAVE A COMMENT SECTION

# Groups tab checklist

## DONE
- Create group

- View and display groups

- FIXED NUMBER OF WORDS FOR TITLE AND DESCRIPTION

- HAVE A READMORE BUTTON OR LIMIT THE CHARS COMPLETELY TO AVOID OVERFLOW OF DESCRIPTION 

- FETCH THE COUNT NO OF IDEAS AND DISPLAY THEM ON THE GROUPS LANDING PAGE

- Remove list view

- Increase margins

- Remove the config button in the group component html page 


## TO BE DONE

- Remove the console logs

- SHOW THE CHAR NUMBER FOR TITLE AND DESCRIPTION IN THE SHARE IDEA FORM  - HAVE THE SAME DESIGN AS THE IDEAS TAB FOR THIS CHANGES TO BE MADE TO THE MODAL FOR CREATE GROUP

- CHANGE THE CREATE GROUP TO A MODAL NOT AN INLINE ELEMENT

- Pagination

- Leave group endpoint 

- VIEW REQUESTS ENDPOINT

- REJECT REQUESTS ENDPOINT

- NOTIFICATIONS TAB TIES TO THE ABOVE ENDPOINTS

- BETTER UI

- PLACE THAT DELETE ICON OR BUTTON SOMEWHERE BETTER - ALSO CHANGE HOW IT LOOKS DOES NOT LOOK GOOD

- Edit that out ? logo - have something else in place maybe an avatar or think of something

- Have it as either member or admin tag (remove the "you are")

- Have it as either member or admin tag (remove the "you are")

- Ensure the information and components inside each group card is level with those around it

## NICE TO HAVE

- EDIT GROUP NAME button probably

- POSSIBLY HAVE CATEGORIES TO AVOID SO MUCH CLUTTER FROM ALL SORTS OF GROUPS WITH THE FORMATION OF GROUPS - how can we categorize the groups

- HAVE FILTERS - MAYBE LIKE A DATE FILTER

- MAYBE HAVE A SEARCH BAR

# CONSIDERATION

SHORTENING THE LINES OF CODE IN THE CSS FILES MAINLY - ALSO LOOK AT THE GROUP COMPONENT TS FILE AND THE ROLE FETCHING HAPPENING IN THE AUTH SERVICE TS FILE

REMOVE ANY UNNECESSARY CODE 

ENSURE YOU DRY 

REVIEW THE CODE AGAIN AND AGAIN AND UNDERSTAND IT 

REMOVE UNNECESSARY COMMENTS