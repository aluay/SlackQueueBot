//  Those are the blocks that build and format the modals

let queue;
let day;
let existingAdmins;

const emptyQueueBlock = [
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "`Please join the queue if you need assistance`"
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*This queue is empty*"
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          emoji: true,
          text: "Join"
        },
        style: "primary",
        value: "join",
        action_id: "join"
      },
      {
        type: "overflow",
        options: [
          {
            text: {
              type: "plain_text",
              text: "Remove First Person",
              emoji: true
            },
            value: "removeFirstPerson"
          },
          {
            text: {
              type: "plain_text",
              text: "Remove Specific Person",
              emoji: true
            },
            value: "removeSpecificPerson"
          },
          {
            text: {
              type: "plain_text",
              text: "Clear Queue",
              emoji: true
            },
            value: "clearQueue"
          },
          {
            text: {
              type: "plain_text",
              text: "Bring queue to front",
              emoji: true
            },
            value: "bringQueueToFront"
          },
          {
            text: {
              type: "plain_text",
              text: "Configurations",
              emoji: true
            },
            value: "config"
          }
        ],
        action_id: "overflow"
      }
    ]
  },
  {
    type: "divider"
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text:
          "Click the `Join` button to join the queue\n Once you're done, click `Leave` to leave"
      }
    ]
  }
];

const fullQueueBlock = queue => [
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "`Please join the queue if you need assistance`"
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*People in queue*"
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `${queue}`
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          emoji: true,
          text: "Join"
        },
        style: "primary",
        value: "join",
        action_id: "join"
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          emoji: true,
          text: "Leave"
        },
        style: "danger",
        value: "leave",
        action_id: "leave"
      },
      {
        type: "overflow",
        options: [
          {
            text: {
              type: "plain_text",
              text: "Remove First Person",
              emoji: true
            },
            value: "removeFirstPerson"
          },
          {
            text: {
              type: "plain_text",
              text: "Remove Specific Person",
              emoji: true
            },
            value: "removeSpecificPerson"
          },
          {
            text: {
              type: "plain_text",
              text: "Clear Queue",
              emoji: true
            },
            value: "clearQueue"
          },
          {
            text: {
              type: "plain_text",
              text: "Bring to front",
              emoji: true
            },
            value: "bringQueueToFront"
          },
          {
            text: {
              type: "plain_text",
              text: "Configurations",
              emoji: true
            },
            value: "config"
          }
        ],
        action_id: "overflow"
      }
    ]
  },
  {
    type: "divider"
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text:
          "Click the `Join` button to join the queue\n Once you're done, click `Leave` to leave"
      }
    ]
  }
];

const configurationsBlock = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "Notification Message :speech_balloon:",
      emoji: true
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Click to Modify Message",
          emoji: true
        },
        style: "primary",
        value: "click_me_123",
        action_id: "notficationMessageButtonClicked"
      }
    ]
  },
  {
    type: "divider"
  },
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "Operation Hours :alarm_clock:",
      emoji: true
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "Select a day to edit its operation hours"
    },
    accessory: {
      type: "static_select",
      placeholder: {
        type: "plain_text",
        text: "Select a day",
        emoji: true
      },
      options: [
        {
          text: {
            type: "plain_text",
            text: "Monday",
            emoji: true
          },
          value: "Monday"
        },
        {
          text: {
            type: "plain_text",
            text: "Tuesday",
            emoji: true
          },
          value: "Tuesday"
        },
        {
          text: {
            type: "plain_text",
            text: "Wenesday",
            emoji: true
          },
          value: "Wednesday"
        },
        {
          text: {
            type: "plain_text",
            text: "Thursday",
            emoji: true
          },
          value: "Thursday"
        },
        {
          text: {
            type: "plain_text",
            text: "Friday",
            emoji: true
          },
          value: "Friday"
        }
      ],
      action_id: "operationHoursDaySelected"
    }
  },
  {
    type: "divider"
  },
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "Administrators :muscle:",
      emoji: true
    }
  },
  {
    type: "section",
    text: {
      type: "plain_text",
      text: "Click the buttons to add or remove admins",
      emoji: true
    }
  },
  {
    type: "actions",
    elements: [
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Add Admins",
          emoji: true
        },
        style: "primary",
        action_id: "addAdminsButtonClicked"
      },
      {
        type: "button",
        text: {
          type: "plain_text",
          text: "Remove Admins",
          emoji: true
        },
        style: "danger",
        action_id: "removeAdminsButtonClicked"
      }
    ]
  }
];

const hoursBlock = day => [
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*Work Hours - 24h Format*"
    }
  },
  {
    type: "divider"
  },
  {
    type: "header",
    text: {
      type: "plain_text",
      text: day,
      emoji: true
    }
  },
  {
    type: "input",
    element: {
      type: "plain_text_input",
      action_id: "startTime",
      placeholder: {
        type: "plain_text",
        text: "Enter start hour only. No minutes. e.g 8"
      }
    },
    label: {
      type: "plain_text",
      text: "Start time",
      emoji: true
    }
  },
  {
    type: "input",
    element: {
      type: "plain_text_input",
      action_id: "endTime",
      placeholder: {
        type: "plain_text",
        text: "Enter end hour only. No minutes. e.g 17"
      }
    },
    label: {
      type: "plain_text",
      text: "End time",
      emoji: true
    }
  }
];

const addAdminsBlock = existingAdmins => [
  {
    type: "input",
    element: {
      type: "multi_users_select",
      placeholder: {
        type: "plain_text",
        text: "Select users",
        emoji: true
      },
      action_id: "adminsAdded"
    },
    label: {
      type: "plain_text",
      text: "Select user(s) to add to the admins list",
      emoji: true
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Current Admins* \n${existingAdmins}`
    }
  }
];

const removeAdminsBlock = existingAdmins => [
  {
    type: "input",
    element: {
      type: "multi_users_select",
      placeholder: {
        type: "plain_text",
        text: "Select users",
        emoji: true
      },
      action_id: "adminsRemoved"
    },
    label: {
      type: "plain_text",
      text: "Select user(s) to remove from the admins list",
      emoji: true
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*Current Admins* \n${existingAdmins}`
    }
  }
];

const removeSpecificPersonBlock = [
  {
    type: "input",
    element: {
      type: "multi_users_select",
      placeholder: {
        type: "plain_text",
        text: "Select users",
        emoji: true
      },
      action_id: "personRemoved"
    },
    label: {
      type: "plain_text",
      text: "Select user(s) to remove from the queue",
      emoji: true
    }
  }
];

const notificationMessageBlock = [
  {
    type: "input",
    element: {
      type: "plain_text_input",
      multiline: true,
      action_id: "notificationMessageSubmitted"
    },
    label: {
      type: "plain_text",
      text:
        "Enter a message the user should see when joining outside operation hours",
      emoji: true
    }
  }
];

const appHomePage = [
  {
    type: "header",
    text: {
      type: "plain_text",
      text: "Hello :wave:",
      emoji: true
    }
  },
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "*QBot* can help easily organize team activities on Slack."
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text:
        ":inbox_tray: Install QBot at your team’s workspace and … boom! Now you will be able to create a queue for each channel by typing `/qbot`"
    }
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text:
        "- Start a new queue in any channel using a global shortcut :zap: \n\n- Use `Join` and `Leave` buttons to join & leave the queue :radio_button:\n\n- Click the three-dots `[...]` options button for configurations and more :gear:"
    }
  },
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text:
        "Example use cases for *QBot*: \n\n Queue to present during a meeting :teacher:\n\n Queue to assist  in IT channels :wrench:\n\n Queue to coordinate code merges :100:\n\n Queue to manage work in progress :dart:"
    }
  },
  {
    type: "divider"
  },
  {
    type: "section",
    text: {
      type: "mrkdwn",
      text: "QBot was developed by *Abdullah Luay* :technologist:"
    }
  }
];

module.exports = {
  emptyQueueBlock,
  fullQueueBlock,
  configurationsBlock,
  hoursBlock,
  addAdminsBlock,
  removeAdminsBlock,
  removeSpecificPersonBlock,
  notificationMessageBlock,
  appHomePage
};
