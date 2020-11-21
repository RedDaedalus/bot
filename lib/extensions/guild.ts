import {
  Guild,
  Structures,
  TextChannel,
  MessageEmbed,
  MessageEmbedOptions,
} from "discord.js";
import { GuildSettings } from "../util/settings";
import { Language } from "../util/language";
import { FireMember } from "./guildmember";
import { Fire } from "../Fire";

export class FireGuild extends Guild {
  client: Fire;
  owner: FireMember;
  settings: GuildSettings;
  language: Language;

  constructor(client: Fire, data: object) {
    super(client, data);
    this.settings = new GuildSettings(client, this);
    this.language = client.getLanguage(
      this.settings.get("utils.language", "en-US")
    );
  }

  isPublic() {
    return (
      this.settings.get("utils.public", false) ||
      (this.features && this.features.includes("DISCOVERABLE"))
    );
  }

  getDiscoverableData() {
    let splash = "https://i.imgur.com/jWRMBRd.png";
    if (this.splash)
      splash = this.splashURL({
        size: 2048,
        format: "png",
      }).replace("size=2048", "size=320");
    else if (this.discoverySplash)
      splash = this.discoverySplashURL({
        size: 2048,
        format: "png",
      }).replace("size=2048", "size=320");
    const icon = this.iconURL({
      format: "png",
      size: 128,
      dynamic: true,
    });
    return {
      name: this.name,
      id: this.id,
      icon,
      splash,
      vanity: `https://discover.inv.wtf/${this.id}`,
      members: this.memberCount,
    };
  }

  getMember(name: string): FireMember | null {
    const username = name.split("#")[0];
    const member = this.members.cache.find(
      (member) =>
        member.toString().toLowerCase() == name.toLowerCase() ||
        member.displayName?.toLowerCase() == username.toLowerCase() ||
        member.user.username?.toLowerCase() == username.toLowerCase()
    );

    return member ? (member as FireMember) : null;
  }

  async fetchMember(name: string): Promise<FireMember | null> {
    const member = this.getMember(name);

    if (member) {
      return member;
    } else {
      const fetchedMembers = await this.members.fetch({
        user: this.members.cache.size ? [...this.members.cache.array()] : [],
        query: name,
        limit: 1,
      });

      return fetchedMembers.first() as FireMember | null;
    }
  }

  async actionLog(log: string | MessageEmbed | MessageEmbedOptions) {
    const channel = this.channels.cache.get(this.settings.get("log.action"));
    if (!channel || channel.type != "text") return;
    return await (channel as TextChannel).send(log);
  }

  async modLog(log: string | MessageEmbed | MessageEmbedOptions) {
    const channel = this.channels.cache.get(
      this.settings.get("log.moderation")
    );
    if (!channel || channel.type != "text") return;
    return await (channel as TextChannel).send(log);
  }

  hasExperiment(id: string, treatmentId?: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild") return false;
    for (const c of Object.keys(experiment.defaultConfig)) {
      if (!this.settings.has(c))
        this.settings.set(c, experiment.defaultConfig[c]);
    }
    if (treatmentId != undefined) {
      const treatment = experiment.treatments.find((t) => t.id == treatmentId);
      if (!treatment) return false;
      return Object.keys(treatment.config).every(
        (c) =>
          this.settings.get(c, experiment.defaultConfig[c] || null) ==
          treatment.config[c]
      );
    } else
      return experiment.treatments.some((treatment) => {
        return Object.keys(treatment.config).every(
          (c) =>
            this.settings.get(c, experiment.defaultConfig[c] || null) ==
            treatment.config[c]
        );
      });
  }

  giveExperiment(id: string, treatmentId: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild")
      throw new Error("Experiment is not a guild experiment");
    const treatment = experiment.treatments.find((t) => t.id == treatmentId);
    if (!treatment) throw new Error("Invalid Treatment ID");
    Object.keys(experiment.defaultConfig).forEach(
      // Set to default before applying treatment changes
      (c) => this.settings.set(c, experiment.defaultConfig[c])
    );
    Object.keys(treatment.config).forEach((c) =>
      this.settings.set(c, treatment.config[c])
    );
    return this.hasExperiment(id, treatmentId);
  }

  removeExperiment(id: string) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild")
      throw new Error("Experiment is not a guild experiment");
    Object.keys(experiment.defaultConfig).forEach((c) =>
      this.settings.set(c, experiment.defaultConfig[c])
    );
    return this.hasExperiment(id);
  }
}

Structures.extend("Guild", () => FireGuild);
