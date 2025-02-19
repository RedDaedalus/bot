import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { Language } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";
import { Module } from "@fire/lib/util/module";
import { Argument } from "discord-akairo";
import { Permissions } from "discord.js";

export default class Unload extends Command {
  constructor() {
    super("unload", {
      description: (language: Language) =>
        language.get("UNLOAD_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.ADD_REACTIONS],
      args: [
        {
          id: "module",
          type: Argument.union("command", "language", "listener", "module"),
          readableType: "command|language|listener|module",
          default: null,
          required: true,
        },
        {
          id: "broadcast",
          match: "flag",
          flag: "--broadcast",
          default: null,
        },
      ],
      ownerOnly: true,
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: {
      module?: Command | Language | Listener | Module;
      broadcast?: string;
    }
  ) {
    if (!args.module) return await message.error();
    try {
      if (this.client.manager.ws)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: message.guild
                ? `${message.guild} (${message.guild.id})`
                : "N/A",
              shard: message.guild ? message.guild.shardID : 0,
              cluster: this.client.manager.id,
              action: `${args.module.handler.classToHandle.name} ${args.module.id} was reloaded`,
            })
          )
        );
      if (args.broadcast) {
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.LOAD_MODULE, {
              name: args.module.id,
              type: args.module.handler.classToHandle.name,
              action: "unload",
            })
          )
        );
        return await message.react("📤");
      } else {
        args.module.remove();
        return await message.success();
      }
    } catch {
      return await message.error();
    }
  }
}
