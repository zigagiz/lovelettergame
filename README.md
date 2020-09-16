# Love Letter

###### This was my first project after completing a full-stack web development crash course on Udemy. 
<br>

Building a simple browser game seemed like a fun idea so I decided to make my version of Love Letter - a popular 2-4 player card game designed by Seiji Kanai (published by [Z-Man Games](https://www.zmangames.com/en/index/) in 2012). 

The original game contains only 8 different cards, but each card performs a special action. The combination of these properties makes this game a great candidate for a small project since there is a bit of tricky logic to handle despite it having only a few different pieces. 

<br>

![](LoveLetter.gif)
<br><br>
The result is a single page app that can host a game for 4 players. Front-end handles the rendering and user input, while the back-end handles all the logic, making sure every player has the same game state. 
Socket.io is used for client-server communication. The design is written in vanilla CSS. 
<br>
<hr>

### Technologies used

- Javascript
- jQuery
- CSS
- Node.js
- Express
- socket.io

### To do

- Replace remaining alerts & prompts with custom modals
- Chat & player actions log (with timestamps)
- Lobby system with multiple rooms
- Final UI polish
- Additional testing
- Gender neutral pronouns
