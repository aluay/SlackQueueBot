const methods = require("./methods.js");

//  Get the invitation event and extract info from it
methods.app.event("member_joined_channel", async ({ event }) => {
  //  Get the invitee info
  const getInvitedUserInfo = await methods.app.client.users.info({
    token: process.env.SLACK_BOT_TOKEN,
    user: event.user
  });

  //  Get the channel info
  const getChannelInfo = await methods.app.client.conversations.info({
    token: process.env.SLACK_BOT_TOKEN,
    channel: event.channel
  });

  //  Get current time
  const currentTime = new Date();

  if (
    //  If invitee is of type "bot" and its name matches the bot name
    getInvitedUserInfo.user.is_bot &&
    getInvitedUserInfo.user.name === "qbot"
  ) {
    //  Create the backend (required directories and files)
    methods.initBackend(getChannelInfo, event.inviter);
    //  Log the invitation event
    methods.logger(
      getChannelInfo.channel.id,
      `[Bot has been invited to: ${getChannelInfo.channel.name_normalized}]`
    );

    //  Display message console
    console.log(
      `[Bot has been invited to: ${getChannelInfo.channel.name_normalized}]`
    );
  }
});

//  This will handle the main /qbot command to initialize the bot
methods.app.command("/qbot", async ({ ack, body }) => {
  //  Acknowledge the action
  await ack();
  //  Connect to the database

  if (body.text == "") {
    //  Initialize the queue
    methods.initQueue(body.channel_id);
    //  Add the user to the admins list
    methods.adminsHandler(body.user_id, body.channel_id, 1);
  } else if (
    body.text == "coder" ||
    body.text == "programmer" ||
    body.text == "author"
  ) {
    await methods.app.client.chat.postEphemeral({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.channel_id,
      user: body.user_id,
      text: `This guy made me :point_right: Abdullah Luay`
    });
  } else {
    await methods.app.client.chat.postEphemeral({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.channel_id,
      user: body.user_id,
      text: `Hmm, I don't understand that command :thinking_face:`
    });
  }
});

//  Join the queue via button click
methods.app.action("join", async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  const joinTimestamp = new Date(body.actions[0].action_ts * 1000);

  //  Check if the user has joined within or outside working hours
  methods.checkOperationHours(joinTimestamp, body.channel.id, body.user.id);

  //  Add user to database
  methods.addUserToQueue(body.user.id, body.channel.id, body, say);
});

//  Leave the queue
methods.app.action("leave", async ({ body, ack, say }) => {
  // Acknowledge the action
  await ack();
  //  Delete user from database
  methods.removeUserFromQueue(body.user.id, body.channel.id, body, say);
});

//  Overflow menu controller
methods.app.action("overflow", async ({ ack, action, body }) => {
  await ack();
  methods.overflowHandler(ack, action, body);
});

//  App home page handler
methods.app.event("app_home_opened", async ({ event, client }) => {
  methods.homePage(event, client);
});

// Start app
(async () => {
  //  Start the app on port 3000
  await methods.app.start(process.env.PORT || 3000);
  console.log("🟢 Bot is ready!");
})();
