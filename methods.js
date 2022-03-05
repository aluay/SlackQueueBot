const fs = require("fs");
const Sqlite3 = require("sqlite3").verbose();
const modal = require("./blocks/blocks.js");
const { App } = require("@slack/bolt");
const { WebClient, LogLevel } = require("@slack/web-api");

//  Initialize a new App constant
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

//  Initialize a new WebClient constant that will handle messages and message interactions, such as pins/reactions/updates/posts
const client = new WebClient(process.env.SLACK_BOT_TOKEN, {});

//  Create the backend (required directories and files)
const initBackend = async (channelInfo, inviter) => {
  //const db = new Sqlite3.Database(`./db/${channelInfo.channel.id}.db`);
  const dirs = ["db", "logs"];
  try {
    if (fs.existsSync(`./db/${channelInfo.channel.id}.db`)) {
      console.log(
        `[Database already exists for ${channelInfo.channel.name_normalized}]`
      );
    } else {
      console.log(
        `[Database not found for '${channelInfo.channel.name_normalized}' creating one...]`
      );
      //  Create the required directories
      createDirectories(dirs);
      //  Create the database
      createDB(channelInfo.channel.id);

      console.log(
        `[Database created for ${channelInfo.channel.name_normalized}]`
      );
    }
  } catch (err) {
    console.log(
      `[Something went wrong while creating database for '${channelInfo.channel.name_normalized}']`
    );
    throw err;
  }
};

//  Create the required directories to save files
const createDirectories = async dir => {
  for (let i = 0; i < dir.length; i++) {
    if (fs.existsSync(dir[i])) {
      console.log(`[Directories already exist]`);
    } else {
      fs.mkdirSync(dir[i]);
      console.log(`[${dir[i]} directory has been created]`);
    }
  }
};

//  Create the database and the tables
const createDB = async channel => {
  const db = new Sqlite3.Database(`./db/${channel}.db`);
  db.run("CREATE TABLE IF NOT EXISTS queue(name text)");
  db.run("CREATE TABLE IF NOT EXISTS admins(name text)");
  db.run(
    "CREATE TABLE IF NOT EXISTS hours(day text, startTime text, endTime text)"
  );
  db.run("CREATE TABLE IF NOT EXISTS info(notificationMessage text)");
  db.close();
};

//  Admins list handler
//  Add and remove admins based on flow
const adminsHandler = async (admin, channel, flow) => {
  const db = new Sqlite3.Database(`./db/${channel}.db`);
  //  If flow = 1, then we add to the admins list
  if (flow == 1) {
    addAdmins(db, admin, channel);
  } else {
    //  If flow != 0, then we remove from the admins list
    removeAdmins(db, admin, channel);
  }
};

//  Add a user to the admins list
const addAdmins = async (db, admin, channel) => {
  db.get("SELECT * FROM admins WHERE name = ?", [admin], async (err, row) => {
    if (err) {
      throw err;
    } else {
      if (row) {
        console.log("[Admin already exists]");
      } else {
        db.run("INSERT INTO admins(name) VALUES(?)", [admin], async err => {
          if (err) {
            throw err;
          } else {
            console.log("[Admin added to the database]");
            logger(
              channel,
              "[" + admin + " has been added to the admin's list]"
            );
          }
        });
      }
    }
  });
};

//  Remove a user from the admins list
const removeAdmins = async (db, admin, channel) => {
  db.get("SELECT * FROM admins WHERE name = ?", [admin], async (err, row) => {
    if (err) {
      throw err;
    } else {
      if (!row) {
        console.log("[Admin does not exists]");
      } else {
        db.run("DELETE FROM admins WHERE name = ?", [admin], async err => {
          if (err) {
            throw err;
          } else {
            console.log("[Admin removed from the database]");
            logger(
              channel,
              `[${admin} have been removed from the admin database]`
            );
          }
        });
      }
    }
  });
};

//  Log info to the log file
const logger = async (channel, text) => {
  const currentTime = new Date();
  const logCreationDate = new Date().toISOString().slice(0, 10);
  const log = `./logs/${channel}.txt`;
  //  Check if the log file already exists
  if (fs.existsSync(log)) {
    //  Append logs to the file
    fs.appendFile(log, currentTime + " => " + text + "\n", err => {
      if (err) throw err;
    });
  } else {
    //  If log file does not exist, then create one and append to it
    console.log(`[Log not found for ${channel}, creating one...]`);
    fs.writeFile(log, "", function(err) {
      if (err) {
        console.log(err);
      }
      fs.appendFile(log, currentTime + " => " + text + "\n", err => {
        if (err) throw err;
      });
      console.log(`[Log created for ${channel}]`);
    });
  }
};

//  Post a message to the channel
const initQueue = async channel => {
  let queue = "";
  const db = new Sqlite3.Database(`./db/${channel}.db`);
  db.get("SELECT COUNT(*) FROM queue", async (err, row) => {
    if (err) {
      throw err;
    } else {
      if (Object.values(row) == 0) {
        console.log("[Queue is empty]");
        const empty = await app.client.chat.postMessage({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channel,
          blocks: modal.emptyQueueBlock,
          text: "Message from Queue Bot"
        });
        app.client.pins.add({
          token: process.env.SLACK_BOT_TOKEN,
          channel: empty.channel,
          timestamp: empty.ts
        });
      } else {
        console.log(`[Database contains: ${Object.values(row)} items]`);
        db.all("SELECT * FROM queue", async (err, rows) => {
          if (err) {
            throw err;
          }
          rows.forEach(async (row, i) => {
            queue =
              queue + `${"` " + (i + 1) + " `"} *${"<@" + row.name}>* \n\n`;
          });
          const show = await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: channel,
            blocks: modal.fullQueueBlock(queue),
            text: "Message from Queue Bot"
          });
          app.client.pins.add({
            token: process.env.SLACK_BOT_TOKEN,
            channel: show.channel,
            timestamp: show.ts
          });
        });
      }
    }
  });
};

//  Insert into queue database
const addUserToQueue = async (username, channel, body, say) => {
  const db = new Sqlite3.Database(`./db/${channel}.db`);
  dbCheck(db, "SELECT * FROM queue WHERE name = ?", username, body, 1, say);
};

//  Delete from queue database
const removeUserFromQueue = async (username, channel, body, say) => {
  const db = new Sqlite3.Database(`./db/${body.channel.id}.db`);
  dbCheck(db, "SELECT * FROM queue WHERE name = ?", username, body, 0, say);
};

/*
  Use "db.get" to only return the first result found that matches the query
  The flow variable will determine where to route the flow
  flow = 1 if we want to add a user to the queue
  flow = 0 if we want to remove a user from the queue
*/
const dbCheck = async (db, stmt, username, body, flow, say) => {
  db.get(stmt, [username], async (err, row) => {
    if (err) {
      throw err;
    } else {
      if (flow == 1) {
        if (row) {
          await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel.id,
            user: body.user.id,
            text: "You are already in the queue."
          });
        } else {
          dbInsert(db, "INSERT INTO queue(name) VALUES(?)", body, say);
        }
      } else {
        if (row) {
          dbDelete(db, "DELETE FROM queue WHERE name = ?", username, body, say);
        } else {
          await app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel.id,
            user: body.user.id,
            text: "You are not in the queue."
          });
        }
      }
    }
  });
};

//  Use "db.run" to insert into database, since no result needs to be returned
const dbInsert = async (db, stmt, body, say) => {
  db.run(stmt, [body.user.id], async err => {
    if (err) {
      throw err;
    } else {
      messageHandler(body.channel.id, body.message.ts);
    }
  });
  console.log("[User has joined the queue]");
  logger(body.channel.id, `[${body.user.username} has joined the queue]`);
  await say("<@" + body.user.id + ">" + " has joined the queue");
};

//  Handle the deletion from the database
const dbDelete = async (db, stmt, username, body, say) => {
  db.run(stmt, username, async err => {
    if (err) {
      throw err;
    } else {
      messageHandler(body.channel.id, body.message.ts);
    }
  });
  console.log("[User has left the queue]");
  logger(body.channel.id, `[${body.user.username} has left the queue]`);
  await say("<@" + body.user.id + ">" + " has left the queue");
};

/*
  Update/post the queue message in a channel
  I'm using a little hack here:
  If the messageTS is 0, then we post to the channel
  If the messageTS not 0, then we update the existing message in the channel
  I'm basically using the same function to do 2 things, instead of two functions doing similar things
*/
const messageHandler = async (channelID, messageTS) => {
  const db = new Sqlite3.Database(`./db/${channelID}.db`);
  dbCheckUserCount(db, "SELECT COUNT(*) FROM queue", channelID, messageTS);
};

//  Check if user already exsits in the queue
const dbCheckUserCount = async (db, stmt, channelID, messageTS) => {
  if (messageTS == 0) {
    db.get(stmt, async (err, row) => {
      if (err) {
        throw err;
      } else {
        if (Object.values(row) == 0) {
          console.log("[Queue is empty]");
          //  Post new queue message is queue is empty
          const empty = await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: channelID,
            blocks: modal.emptyQueueBlock,
            text: "Message from Queue Bot"
          });
          //  Pin the above queue message
          app.client.pins.add({
            token: process.env.SLACK_BOT_TOKEN,
            channel: empty.channel,
            timestamp: empty.ts
          });
        } else {
          //  Read the database and post new queue message with current users
          postNewQueue(db, "SELECT * FROM queue", channelID);
        }
      }
    });
  } else {
    db.get(stmt, async (err, row) => {
      if (err) {
        throw err;
      } else {
        if (Object.values(row) == 0) {
          console.log("[Queue is empty]");
          //  Update existing queue message
          const empty = await app.client.chat.update({
            token: process.env.SLACK_BOT_TOKEN,
            channel: channelID,
            ts: messageTS,
            blocks: modal.emptyQueueBlock,
            text: "Message from Queue Bot"
          });
        } else {
          updateQueue(db, "SELECT * FROM queue", channelID, messageTS);
        }
      }
    });
  }
};

//  Update the queue with current users
const updateQueue = async (db, stmt, channelID, messageTS) => {
  let queue = "";
  db.all("SELECT * FROM queue", [], async (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach(async (row, i) => {
      queue = queue + `${"` " + (i + 1) + " `"} *${"<@" + row.name}>* \n\n`;
    });
    const full = await app.client.chat.update({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelID,
      ts: messageTS,
      blocks: modal.fullQueueBlock(queue),
      text: "Message from Queue Bot"
    });
  });
};

//  Read the database and post new queue message with current users
const postNewQueue = async (db, stmt, channelID) => {
  let queue = "";
  db.all("SELECT * FROM queue", [], async (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach(async (row, i) => {
      queue = queue + `${"` " + (i + 1) + " `"} *${"<@" + row.name}>* \n\n`;
    });
    const full = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelID,
      blocks: modal.fullQueueBlock(queue),
      text: "Message from Queue Bot"
    });
    app.client.pins.add({
      token: process.env.SLACK_BOT_TOKEN,
      channel: full.channel,
      timestamp: full.ts
    });
  });
};

//  Remove the first person from the queue
const removeFirstPerson = body => {
  const db = new Sqlite3.Database(`./db/${body.channel.id}.db`);
  db.run(
    "DELETE FROM queue WHERE ROWID IN (SELECT ROWID FROM queue LIMIT 1)",
    async err => {
      if (err) {
        throw err;
      } else {
        console.log("[Removed first person from queue]");
        logger(body.channel.id, "[Removed first person from queue]");
        messageHandler(body.channel.id, body.message.ts);
      }
    }
  );
};

//  Remove a specific person from the queue. This has a modal view to enter the username
const removeSpecificPerson = async (body, channelID, messageTS) => {
  const viewBody = body;
  const db = new Sqlite3.Database(`./db/${body.channel.id}.db`);
  const message = app.client.views.open({
    token: process.env.SLACK_BOT_TOKEN,
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "personRemoved",
      title: {
        type: "plain_text",
        text: "Bot Configurations",
        emoji: true
      },
      submit: {
        type: "plain_text",
        text: "Submit",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true
      },
      blocks: modal.removeSpecificPersonBlock
    }
  });
  //  The below function will execute once the above modal is submitted
  app.view("personRemoved", async ({ body, ack }) => {
    const removePerson = Object.values(body.view.state.values)[0].personRemoved
      .selected_users;
    for (let i = 0; i < removePerson.length; i++) {
      //console.log(removePerson[i]);
      dbCheck(db, "SELECT * FROM queue WHERE name = ?", removePerson[i], viewBody, 0);
    }
    await ack();
  });
};

//  Clear the queue by removing eveyone from it, then posting a new queue message
const clearQueue = async body => {
  const db = new Sqlite3.Database(`./db/${body.channel.id}.db`);
  db.run("DELETE FROM queue", async err => {
    if (err) {
      throw err;
    }
  });
  try {
    // Call the chat.delete method using the WebClient
    const deleteMessage = await client.chat.delete({
      channel: body.channel.id,
      ts: body.message.ts
    });
    messageHandler(body.channel.id, 0);
  } catch (error) {
    console.error(error);
  }
  console.log("[Queue has been cleared]");
  logger(body.channel.id, `[Queue has been cleared by ${body.user.username}]`);
};

//  If the queue message gets pushed up the stream, then delete it and post a new one
const bringQueueToFront = async body => {
  try {
    // Call the chat.delete method using the WebClient
    const deleteMessage = await client.chat.delete({
      channel: body.channel.id,
      ts: body.message.ts
    });
  } catch (error) {
    console.error(error);
  }
  messageHandler(body.channel.id, 0);
};

//  Queue configurations -- Invoked from overflow menu
const config = async (body, ack) => {
  const db = new Sqlite3.Database(`./db/${body.channel.id}.db`);
  const channelID = body.channel.id;
  const message = app.client.views.open({
    token: process.env.SLACK_BOT_TOKEN,
    trigger_id: body.trigger_id,
    view: {
      type: "modal",
      callback_id: "configSubmitted",
      title: {
        type: "plain_text",
        text: "Bot Configurations",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Close",
        emoji: true
      },
      blocks: modal.configurationsBlock
    }
  });

  //  Switch to the notification message view
  app.action("notficationMessageButtonClicked", async ({ body, ack }) => {
    disaplyNotificationMessageModal(db, channelID, body.trigger_id);
    await ack();
  });
  //  Switch to the add admins modal view
  app.action("addAdminsButtonClicked", async ({ body, ack }) => {
    displayAddAdminsModal(db, channelID, body.trigger_id);
    await ack();
  });
  //  Switch to the remove admins modal view
  app.action("removeAdminsButtonClicked", async ({ body, ack }) => {
    displayRemoveAdminsModal(db, channelID, body.trigger_id);
    await ack();
  });
  //  Switch to the operation hours modal view
  app.action("operationHoursDaySelected", async ({ body, ack }) => {
    const day = Object.values(body.actions)[0].selected_option.value;
    console.log("Selected day: " + day);
    displayOperationHoursForSelectedDay(db, day, channelID, body.trigger_id);
    await ack();
  });
};

const disaplyNotificationMessageModal = async (db, channelID, trigger) => {
  const message = app.client.views.push({
    token: process.env.SLACK_BOT_TOKEN,
    trigger_id: trigger,
    view: {
      type: "modal",
      callback_id: "notificationMessageSubmitted",
      title: {
        type: "plain_text",
        text: "Bot Configurations",
        emoji: true
      },
      submit: {
        type: "plain_text",
        text: "Submit",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true
      },
      blocks: modal.notificationMessageBlock
    }
  });
  app.view("notificationMessageSubmitted", async ({ body, ack }) => {
    const notificationMessage = Object.values(body.view.state.values)[0]
      .notificationMessageSubmitted.value;
    saveNotificationMessageToDB(db, channelID, notificationMessage);
    await ack()
  });
};

const saveNotificationMessageToDB = async (
  db,
  channelID,
  notificationMessage
) => {
  db.run("DELETE FROM info", async err => {
    if (err) {
      throw err;
    }
  });
  db.run(
    "INSERT INTO info (notificationMessage) VALUES(?)",
    [notificationMessage],
    async err => {
      if (err) {
        throw err;
      } else {
        console.log(`[Notification message for ${channelID} has been updated]`);
        logger(
          channelID,
          `[Notification message for ${channelID} has been updated]`
        );
      }
    }
  );
};

const displayOperationHoursForSelectedDay = async (
  db,
  day,
  channelID,
  trigger
) => {
  const message = app.client.views.push({
    token: process.env.SLACK_BOT_TOKEN,
    trigger_id: trigger,
    view: {
      type: "modal",
      callback_id: "hoursSubmitted",
      title: {
        type: "plain_text",
        text: "Bot Configurations",
        emoji: true
      },
      submit: {
        type: "plain_text",
        text: "Submit",
        emoji: true
      },
      close: {
        type: "plain_text",
        text: "Cancel",
        emoji: true
      },
      blocks: modal.hoursBlock(day)
    }
  });

  //  Hours submitted
  app.view("hoursSubmitted", async ({ body, ack }) => {
    const startTime = Object.values(body.view.state.values)[0].startTime.value;
    const endTime = Object.values(body.view.state.values)[1].endTime.value;
    operationHoursHandler(db, day, startTime, endTime, channelID);
    await ack()
  });
};

//  Remove existing hours for the selected day and insert the new hours entered
const operationHoursHandler = async (
  db,
  day,
  startTime,
  endTime,
  channelID
) => {
  db.run("DELETE FROM hours WHERE day=?", day, async err => {
    if (err) {
      throw err;
    }
  });
  db.run(
    "INSERT INTO hours (day, startTime, endTime) VALUES(?, ?, ?)",
    [day, startTime, endTime],
    async err => {
      if (err) {
        throw err;
      } else {
        console.log(
          "[Operations hours for " +
            channelID +
            " for " +
            day +
            " have been updated]"
        );
        logger(
          channelID,
          `[Operation hours for ${channelID} for ${day} have been updated]`
        );
      }
    }
  );
};

//  Display the admins modal which contains the list of admins
const displayAddAdminsModal = async (db, channelID, triggerID) => {
  let existingAdmins = "";
  db.all("SELECT * FROM admins", async (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach(async (row, i) => {
      existingAdmins =
        existingAdmins + `${">`" + (i + 1) + "`"} ${"<@" + row.name}> \n`;
    });
    const message = app.client.views.push({
      token: process.env.SLACK_BOT_TOKEN,
      trigger_id: triggerID,
      view: {
        type: "modal",
        callback_id: "adminsAdded",
        title: {
          type: "plain_text",
          text: "Bot Configurations",
          emoji: true
        },
        submit: {
          type: "plain_text",
          text: "Submit",
          emoji: true
        },
        close: {
          type: "plain_text",
          text: "Cancel",
          emoji: true
        },
        blocks: modal.addAdminsBlock(existingAdmins)
      }
    });
  });
  //  Once the above modal has been submitted, the function below will triger the addAdmins function
  app.view("adminsAdded", async ({ body, ack }) => {
    const admins = Object.values(body.view.state.values)[0].adminsAdded
      .selected_users;

    for (let i in admins) {
      adminsHandler(admins[i], channelID, 1);
    }
    await ack()
  });
};

const displayRemoveAdminsModal = async (db, channelID, trigger) => {
  let existingAdmins = "";
  db.all("SELECT * FROM admins", async (err, rows) => {
    if (err) {
      throw err;
    }
    rows.forEach(async (row, i) => {
      existingAdmins =
        existingAdmins + `${">`" + (i + 1) + "`"} ${"<@" + row.name}> \n`;
    });
    const message = app.client.views.push({
      token: process.env.SLACK_BOT_TOKEN,
      trigger_id: trigger,
      view: {
        type: "modal",
        callback_id: "adminsRemoved",
        title: {
          type: "plain_text",
          text: "Bot Configurations",
          emoji: true
        },
        submit: {
          type: "plain_text",
          text: "Submit",
          emoji: true
        },
        close: {
          type: "plain_text",
          text: "Cancel",
          emoji: true
        },
        blocks: modal.removeAdminsBlock(existingAdmins)
      }
    });
  });
  //  Remove from admins list
  app.view("adminsRemoved", async ({ body, ack }) => {
    const admins = Object.values(body.view.state.values)[0].adminsRemoved
      .selected_users;

    for (let i in admins) {
      adminsHandler(admins[i], channelID, 0);
    }
    await ack()
  });
};

//  Check if the user has joined within or outside working hours
const checkOperationHours = async (joinTimestamp, channel, user) => {
  const db = new Sqlite3.Database(`./db/${channel}.db`);
  const dayName = new Date(joinTimestamp).toLocaleString("en-us", {
    weekday: "long"
  });
  const currentHour = joinTimestamp.getHours() - 7;
  let startHour;
  let endHour;

  //  Get operation hours from the database
  db.all("SELECT * FROM hours WHERE day = ?", [dayName], async (err, row) => {
    if (err) {
      throw err;
    } else {
      if (!row[0]) {
        console.log("[Operation hours not set]");
        logger(channel, "[Operation hours not set]");
      } else {
        startHour = row[0].startTime;
        endHour = row[0].endTime;
        //pass info to another function to compare and send notification
        compareOperationHours(
          db,
          startHour,
          endHour,
          currentHour,
          channel,
          user
        );
      }
    }
  });
};

//  Compare the operation hours save in the database to the current time and send message accordingly
const compareOperationHours = async (
  db,
  startHour,
  endHour,
  currentHour,
  channel,
  user
) => {
  if (currentHour >= startHour && currentHour <= endHour) {
    console.log("[User joined within working hours]");
    logger(channel, "[User joined within working hours]");
  } else {
    db.all("SELECT notificationMessage FROM info", async (err, rows) => {
      if (err) {
        throw err;
      }
      if (rows[0] == undefined) {
        console.log(
          "[Notification message is not setup, using default message]"
        );
        const msg =
          "You may have joined outside working hours for this channel. Try reaching out directly to one of the techs.";
        await app.client.chat.postEphemeral({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channel,
          user: user,
          text: msg
        });
      } else {
        console.log("[Notification message is setup]");
        await app.client.chat.postEphemeral({
          token: process.env.SLACK_BOT_TOKEN,
          channel: channel,
          user: user,
          text: rows[0].notificationMessage
        });
      }
    });

    console.log("[User joined outside working hours]");
    logger(channel, "[User joined outside working hours]");
  }
};

//  Handle the overflow
const overflowHandler = async (ack, action, body) => {
  const db = new Sqlite3.Database(`./db/${body.channel.id}.db`);
  //  Check if the user is an admin first, then do other stuff
  db.get(
    "SELECT * FROM admins WHERE name = ?",
    [body.user.id],
    async (err, row) => {
      if (err) {
        throw err;
      } else {
        if (!row) {
          //  Display message if user is not an admin
          console.log("[User is not an admin]");
          app.client.chat.postEphemeral({
            token: process.env.SLACK_BOT_TOKEN,
            channel: body.channel.id,
            user: body.user.id,
            text: "You are not an admin."
          });
        } else {
          console.log("[User is an admin]");
          if (action.selected_option.value === "removeFirstPerson") {
            removeFirstPerson(body);
          } else if (action.selected_option.value === "removeSpecificPerson") {
            removeSpecificPerson(body);
          } else if (action.selected_option.value === "clearQueue") {
            clearQueue(body);
          } else if (action.selected_option.value === "bringQueueToFront") {
            bringQueueToFront(body);
          } else if (action.selected_option.value === "config") {
            config(body, ack);
          }
        }
      }
    }
  );
};

//  Display app home page
const homePage = async (event, client) => {
  await client.views.publish({
    user_id: event.user,
    view: {
      type: "home",
      blocks: modal.appHomePage
    }
  });
};

module.exports = {
  app,
  initBackend,
  createDirectories,
  createDB,
  adminsHandler,
  logger,
  initQueue,
  addUserToQueue,
  removeUserFromQueue,
  removeFirstPerson,
  removeSpecificPerson,
  clearQueue,
  bringQueueToFront,
  config,
  checkOperationHours,
  overflowHandler,
  homePage
};
