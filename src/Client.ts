/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as _ from "lodash";
import {
  ApplicationCommand,
  Client as ClientJS,
  CommandInteraction,
  CommandInteractionOption,
  Interaction,
  Message,
  Snowflake,
} from "discord.js";
import {
  ClientOptions,
  DApplicationCommand,
  DApplicationCommandOption,
  DComponentButton,
  DComponentSelectMenu,
  DDiscord,
  DOn,
  DSimpleCommand,
  DSimpleCommandOption,
  DiscordEvents,
  GuardFunction,
  GuildNotFoundError,
  IGuild,
  InitCommandConfig,
  MetadataStorage,
  SimpleCommandMessage,
  resolveIGuild,
} from ".";

/**
 * Extend original client class of discord.js
 * @param options object
 * ___
 * [View Documentation](https://discord-ts.js.org/docs/general/client)
 */
export class Client extends ClientJS {
  private _botId: string;
  private _prefix: string | ((message: Message) => Promise<string> | string);
  private _unauthorizedHandler?:
    | string
    | ((command: SimpleCommandMessage) => Promise<void> | void);
  private _silent: boolean;
  private _botGuilds: IGuild[] = [];
  private _guards: GuardFunction[] = [];

  get botGuilds() {
    return this._botGuilds;
  }
  set botGuilds(value) {
    this._botGuilds = value;
  }
  get botGuildsResolved() {
    return resolveIGuild(this, this._botGuilds);
  }

  get guards() {
    return this._guards;
  }
  set guards(value) {
    this._guards = value;
  }

  get prefix() {
    return this._prefix;
  }
  set prefix(value) {
    this._prefix = value;
  }

  get unauthorizedHandler() {
    return this._unauthorizedHandler;
  }
  set unauthorizedHandler(value) {
    this._unauthorizedHandler = value;
  }

  get botId() {
    return this._botId;
  }
  set botId(value) {
    this._botId = value;
  }

  static get applicationCommands() {
    return MetadataStorage.instance
      .applicationCommands as readonly DApplicationCommand[];
  }
  get applicationCommands() {
    return Client.applicationCommands;
  }

  static get simpleCommands() {
    return MetadataStorage.instance.simpleCommands as readonly DSimpleCommand[];
  }
  get simpleCommands() {
    return Client.simpleCommands;
  }

  static get allSimpleCommands() {
    return MetadataStorage.instance.allSimpleCommands as readonly {
      name: string;
      command: DSimpleCommand;
    }[];
  }
  get allSimpleCommands() {
    return Client.allSimpleCommands;
  }

  static get buttons() {
    return MetadataStorage.instance
      .buttonComponents as readonly DComponentButton[];
  }
  get buttons() {
    return Client.buttons;
  }

  static get selectMenus() {
    return MetadataStorage.instance
      .selectMenuComponents as readonly DComponentSelectMenu[];
  }
  get selectMenus() {
    return Client.selectMenus;
  }

  static get allApplicationCommands() {
    return MetadataStorage.instance
      .allApplicationCommands as readonly DApplicationCommand[];
  }
  get allApplicationCommands() {
    return Client.allApplicationCommands;
  }

  static get events() {
    return MetadataStorage.instance.events as readonly DOn[];
  }
  get events() {
    return Client.events;
  }

  static get discords() {
    return MetadataStorage.instance.discords as readonly DDiscord[];
  }
  get discord() {
    return Client.discords;
  }

  static get decorators() {
    return MetadataStorage.instance;
  }
  get decorators() {
    return MetadataStorage.instance;
  }

  get silent() {
    return this._silent;
  }
  set silent(value: boolean) {
    this._silent = value;
  }

  /**
   * Extend original client class of discord.js
   * @param options object
   * ___
   * [View Documentation](https://discord-ts.js.org/docs/general/client)
   */
  constructor(options: ClientOptions) {
    super(options);
    MetadataStorage.classes = [
      ...MetadataStorage.classes,
      ...(options?.classes ?? []),
    ];

    this._silent = !!options?.silent;
    this.guards = options.guards ?? [];
    this.botGuilds = options.botGuilds ?? [];
    this._botId = options.botId ?? "bot";
    this._prefix = options.prefix ?? "!";
    this._unauthorizedHandler = options.commandUnauthorizedHandler;
  }

  /**
   * Start your bot
   * @param token The bot token
   * @param loadClasses A list of glob path or classes
   */
  async login(token: string) {
    await this.decorators.build();

    if (!this.silent) {
      console.log("Events");
      if (this.events.length) {
        this.events.map((event) => {
          const eventName = event.event;
          console.log(`>> ${eventName} (${event.classRef.name}.${event.key})`);
        });
      } else {
        console.log("   No events detected");
      }

      console.log("");

      console.log("Slashes");
      if (this.applicationCommands.length) {
        this.applicationCommands.map((DCommand) => {
          if (DCommand.botIds.length && !DCommand.botIds.includes(this.botId)) {
            return;
          }
          console.log(
            `>> ${DCommand.name} (${DCommand.classRef.name}.${DCommand.key})`
          );
          const printOptions = (
            options: DApplicationCommandOption[],
            depth: number
          ) => {
            if (!options) {
              return;
            }

            const tab = Array(depth).join("      ");

            options.forEach((option) => {
              console.log(
                `${tab}(option) ${option.name}: ${option.type} (${option.classRef.name}.${option.key})`
              );
              printOptions(option.options, depth + 1);
            });
          };

          printOptions(DCommand.options, 2);

          console.log("");
        });
      } else {
        console.log("   No slashes detected");
      }

      console.log("Simple Commands");
      if (this.simpleCommands.length) {
        this.simpleCommands.map((cmd) => {
          console.log(`>> ${cmd.name} (${cmd.classRef.name}.${cmd.key})`);
          if (cmd.aliases.length) {
            console.log("      aliases:", cmd.aliases.join(", "));
          }

          const printOptions = (
            options: DSimpleCommandOption[],
            depth: number
          ) => {
            if (!options) {
              return;
            }

            const tab = Array(depth).join("      ");
            options.forEach((option) => {
              console.log(
                `${tab}(option) ${option.name}: ${option.type} (${option.classRef.name}.${option.key})`
              );
            });
          };

          printOptions(cmd.options, 2);
          console.log("");
        });
      } else {
        console.log("   No simple commands detected");
      }
    }

    this.decorators.usedEvents.map((on) => {
      if (on.once) {
        this.once(
          on.event,
          this.decorators.trigger(this.guards, on.event, this, true)
        );
      } else {
        this.on(on.event, this.decorators.trigger(this.guards, on.event, this));
      }
    });

    return super.login(token);
  }

  /**
   * Get commands mapped by guildid (in case of multi bot, commands are filtered for this client only)
   * @returns
   */
  async CommandByGuild() {
    const botGuildsResolved = await this.botGuildsResolved;

    // # group guild commands by guildId
    const guildDCommandStore = new Map<Snowflake, DApplicationCommand[]>();
    const allGuildDCommands = this.applicationCommands.filter(
      (DCommand) =>
        [...botGuildsResolved, ...DCommand.guilds].length &&
        (!DCommand.botIds.length || DCommand.botIds.includes(this.botId))
    );

    // group single guild commands together
    await Promise.all(
      allGuildDCommands.map(async (DCommand) => {
        const guilds = await resolveIGuild(this, [
          ...botGuildsResolved,
          ...DCommand.guilds,
        ]);
        guilds.forEach((guild) =>
          guildDCommandStore.set(guild, [
            ...(guildDCommandStore.get(guild) ?? []),
            DCommand,
          ])
        );
      })
    );
    return guildDCommandStore;
  }

  /**
   * Initialize all the @Slash with their permissions
   */
  async initApplicationCommands(options?: {
    guild?: InitCommandConfig;
    global?: InitCommandConfig;
  }): Promise<void> {
    const allGuildPromises: Promise<void>[] = [];
    const guildDCommandStore = await this.CommandByGuild();

    // run task to add/update/delete slashes for guilds
    guildDCommandStore.forEach((DCommands, guildId) => {
      // If bot is not in guild, skip it
      const guild = this.guilds.cache.get(guildId);
      if (!guild) {
        return;
      }

      allGuildPromises.push(
        this.initGuildApplicationCommands(guildId, DCommands, options?.guild)
      );
    });

    await Promise.all([
      Promise.all(allGuildPromises),
      this.initGlobalApplicationCommands(options?.global),
    ]);
  }

  /**
   * init application commands for guild
   * @param guildId
   * @param DCommands
   * @param log
   */
  async initGuildApplicationCommands(
    guildId: string,
    DCommands: DApplicationCommand[],
    options?: InitCommandConfig
  ): Promise<void> {
    const botGuildsResolved = await this.botGuildsResolved;

    const guild = this.guilds.cache.get(guildId);
    if (!guild) {
      console.log(`initGuildApplicationCommands: guild not found: ${guildId}`);
      return;
    }

    // fetch already registered application command
    const ApplicationCommands = await guild.commands.fetch();

    // filter only unregistered application command
    const added = DCommands.filter(
      (DCommand) =>
        !ApplicationCommands.find((cmd) => cmd.name === DCommand.name)
    );

    // filter application command to update
    const updated = DCommands.map<
      [ApplicationCommand | undefined, DApplicationCommand]
    >((DCommand) => [
      ApplicationCommands.find((cmd) => cmd.name === DCommand.name),
      DCommand,
    ])
      .filter<[ApplicationCommand, DApplicationCommand]>(
        (cmd): cmd is [ApplicationCommand, DApplicationCommand] =>
          cmd[0] !== undefined
      )
      .filter(
        // skip update, if there is no change in command data
        (cmd) =>
          !_.isEqual(
            _.omit(
              cmd[0]?.toJSON() as JSON,
              "id",
              "applicationId",
              "guild",
              "guildId",
              "version"
            ),
            cmd[1].toJSON()
          )
      );

    // filter commands to delete
    const deleted: ApplicationCommand[] = [];
    await Promise.all(
      ApplicationCommands.map(async (cmd) => {
        const DCommandx = DCommands.find(
          (DCommand) => DCommand.name === cmd.name
        );

        // delete command if it's not found
        if (!DCommandx) {
          deleted.push(cmd);
          return;
        }

        const guilds = await resolveIGuild(this, [
          ...botGuildsResolved,
          ...(DCommandx.guilds ?? []),
        ]);

        // delete command if it's not registered for given guild
        if (!cmd.guildId || !guilds.includes(cmd.guildId)) {
          deleted.push(cmd);
          return;
        }
      })
    );

    // log the changes to commands in console if enabled by options or silent mode is turned off
    if (options?.log || !this.silent) {
      console.log(
        `${this.user?.username} >> guild: #${guild} >> command >> adding ${
          added.length
        } [${added.map((DCommand) => DCommand.name).join(", ")}]`
      );

      console.log(
        `${this.user?.username} >> guild: #${guild} >> command >> deleting ${
          deleted.length
        } [${deleted.map((cmd) => cmd.name).join(", ")}]`
      );

      console.log(
        `${this.user?.username} >> guild: #${guild} >> command >> updating ${
          updated.length
        } [${updated.map((cmd) => cmd[1].name).join(", ")}]`
      );
    }

    const addOperation = options?.disable?.add
      ? []
      : added.map((DCommand) => guild.commands.create(DCommand.toJSON()));

    const updateOperation = options?.disable?.update
      ? []
      : updated.map((command) => command[0].edit(command[1].toJSON()));

    const deleteOperation = options?.disable?.delete
      ? []
      : deleted.map((cmd) => guild.commands.delete(cmd));

    await Promise.all([
      // add
      ...addOperation,

      // update
      ...updateOperation,

      // delete
      ...deleteOperation,
    ]);
  }

  /**
   * init global application commands
   * @param log
   */
  async initGlobalApplicationCommands(
    options?: InitCommandConfig
  ): Promise<void> {
    const botGuildsResolved = await this.botGuildsResolved;

    // # initialize add/update/delete task for global commands
    const AllCommands = (await this.fetchApplicationCommands())?.filter(
      (cmd) => !cmd.guild
    );
    const DCommands = this.applicationCommands.filter(
      (DCommand) =>
        ![...botGuildsResolved, ...DCommand.guilds].length &&
        (!DCommand.botIds.length || DCommand.botIds.includes(this.botId))
    );
    if (AllCommands) {
      const added = DCommands.filter(
        (DCommand) => !AllCommands.find((cmd) => cmd.name === DCommand.name)
      );

      const updated = DCommands.map<
        [ApplicationCommand | undefined, DApplicationCommand]
      >((DCommand) => [
        AllCommands.find((cmd) => cmd.name === DCommand.name),
        DCommand,
      ])
        .filter<[ApplicationCommand, DApplicationCommand]>(
          (ob): ob is [ApplicationCommand, DApplicationCommand] =>
            ob[0] !== undefined
        )
        .filter(
          // skip update, if there is no change in command data
          (cmd) =>
            !_.isEqual(
              _.omit(
                cmd[0]?.toJSON() as JSON,
                "id",
                "applicationId",
                "guild",
                "guildId",
                "version"
              ),
              cmd[1].toJSON()
            )
        );

      const deleted = AllCommands.filter((cmd) =>
        DCommands.every((DCommand) => DCommand.name !== cmd.name)
      );

      // log the changes to commands in console if enabled by options or silent mode is turned off
      if (options?.log || !this.silent) {
        console.log(
          `${this.user?.username} >> global >> command >> adding ${
            added.length
          } [${added.map((DCommand) => DCommand.name).join(", ")}]`
        );
        console.log(
          `${this.user?.username} >> global >> command >> deleting ${
            deleted.size
          } [${deleted.map((cmd) => cmd.name).join(", ")}]`
        );
        console.log(
          `${this.user?.username} >> global >> command >> updating ${
            updated.length
          } [${updated.map((cmd) => cmd[1].name).join(", ")}]`
        );
      }

      // Only available for Guilds
      // https://discord.js.org/#/docs/main/master/class/ApplicationCommand?scrollTo=setPermissions
      // if (slash.permissions.length <= 0) return;

      await Promise.all([
        // add
        ...(options?.disable?.add
          ? []
          : added.map((DCommand) =>
              this.application?.commands.create(DCommand.toJSON())
            )),
        // update
        ...(options?.disable?.update
          ? []
          : updated.map((ob) => ob[0].edit(ob[1].toJSON()))),
        // delete
        ...(options?.disable?.delete
          ? []
          : deleted.map((cmd) => this.application?.commands.delete(cmd))),
      ]);
    }
  }
  /**
   * init all guild command permissions
   */
  async initApplicationPermissions(): Promise<void> {
    const guildDCommandStore = await this.CommandByGuild();
    const promises: Promise<void>[] = [];
    guildDCommandStore.forEach((cmds, guildId) => {
      promises.push(this.initGuildApplicationPermissions(guildId, cmds));
    });
    await Promise.all(promises);
  }

  /**
   * Update application commands permission by GuildId
   * @param guildId guild id
   * @param DCommands commands
   */
  async initGuildApplicationPermissions(
    guildId: string,
    DCommands: DApplicationCommand[]
  ): Promise<void> {
    const guild = this.guilds.cache.get(guildId);
    if (!guild) {
      console.log(
        `initGuildApplicationPermissions: guild not found: ${guildId}`
      );
      return;
    }

    // fetch already registered application command
    const ApplicationCommands = await guild.commands.fetch();

    const commandToUpdate = DCommands.map<
      [ApplicationCommand | undefined, DApplicationCommand]
    >((DCommand) => [
      ApplicationCommands.find((cmd) => cmd.name === DCommand.name),
      DCommand,
    ]).filter<[ApplicationCommand, DApplicationCommand]>(
      (ob): ob is [ApplicationCommand, DApplicationCommand] =>
        ob[0] !== undefined
    );

    await Promise.all(
      commandToUpdate.map((command) => {
        return guild.commands.permissions
          .fetch({ command: command[0] })
          .then(async (permissions) => {
            if (!_.isEqual(permissions, command[1].permissions)) {
              await command[0].permissions.set({
                permissions: await command[1].permissionsPromise(guild),
              });
            }
          })
          .catch(async () => {
            if (command[1].permissions.length) {
              await command[0].permissions.set({
                permissions: await command[1].permissionsPromise(guild),
              });
            }
          });
      })
    );
  }

  /**
   * Fetch the existing application commands of a guild or globally
   * @param guild The guild ID (empty -> globally)
   * @returns
   */
  fetchApplicationCommands(guildID?: Snowflake) {
    if (guildID) {
      const guild = this.guilds.cache.get(guildID);
      if (!guild) {
        throw new GuildNotFoundError(guildID);
      }
      return guild.commands.fetch();
    }
    return this.application?.commands.fetch();
  }

  /**
   * Clear the application commands globally or for some guilds
   * @param guilds The guild IDs (empty -> globally)
   */
  async clearApplicationCommands(...guilds: Snowflake[]) {
    if (guilds.length) {
      await Promise.all(
        guilds.map(async (guild) => {
          // Select and delete the commands of each guild
          const commands = await this.fetchApplicationCommands(guild);
          if (commands) {
            await Promise.all(
              commands.map((value) => {
                this.guilds.cache.get(guild)?.commands.delete(value);
              })
            );
          }
        })
      );
    } else {
      // Select and delete the commands of each guild
      const commands = await this.fetchApplicationCommands();
      if (commands) {
        await Promise.all(
          commands.map(async (command) => {
            await this.application?.commands.delete(command);
          })
        );
      }
    }
  }

  /**
   * Get the group tree of an slash interaction
   * /hello => ["hello"]
   * /test hello => ["test", "hello"]
   * /test hello me => ["test", "hello", "me"]
   * @param interaction The targeted slash interaction
   * @returns
   */
  getApplicationCommandGroupTree(interaction: CommandInteraction) {
    const tree: string[] = [];

    const getOptionsTree = (
      option: Partial<CommandInteractionOption> | undefined
    ): void => {
      if (!option) {
        return;
      }

      if (
        !option.type ||
        option.type === "SUB_COMMAND_GROUP" ||
        option.type === "SUB_COMMAND"
      ) {
        if (option.name) {
          tree.push(option.name);
        }
        return getOptionsTree(Array.from(option.options?.values() ?? [])?.[0]);
      }
    };

    getOptionsTree({
      name: interaction.commandName,
      options: Array.from(interaction.options.data.values()),
      type: undefined,
    });

    return tree;
  }

  /**
   * Return the corresponding @Slash from a tree
   * @param tree
   * @returns
   */
  getApplicationCommandFromTree(tree: string[]) {
    // Find the corresponding @Slash
    return this.allApplicationCommands.find((slash) => {
      switch (tree.length) {
        case 1:
          // Simple command /hello
          return (
            slash.group === undefined &&
            slash.subgroup === undefined &&
            slash.name === tree[0] &&
            slash.type === "CHAT_INPUT"
          );
        case 2:
          // Simple grouped command
          // /permission user perm
          return (
            slash.group === tree[0] &&
            slash.subgroup === undefined &&
            slash.name === tree[1] &&
            slash.type === "CHAT_INPUT"
          );
        case 3:
          // Grouped and subgroupped command
          // /permission user perm
          return (
            slash.group === tree[0] &&
            slash.subgroup === tree[1] &&
            slash.name === tree[2] &&
            slash.type === "CHAT_INPUT"
          );
      }
    });
  }

  /**
   * Execute the corresponding @Slash @ButtonComponent @SelectMenuComponent based on an Interaction instance
   * @param interaction The discord.js interaction instance
   * @returns
   */
  async executeInteraction(interaction: Interaction) {
    const botGuildsResolved = await this.botGuildsResolved;

    if (!interaction) {
      if (!this.silent) {
        console.log("Interaction is undefined");
      }
      return;
    }

    // if interaction is a button
    if (interaction.isButton()) {
      const button = this.buttons.find(
        (DButton) => DButton.id === interaction.customId
      );

      const guilds = await resolveIGuild(this, [
        ...botGuildsResolved,
        ...(button?.guilds ?? []),
      ]);

      if (
        !button ||
        (interaction.guild &&
          guilds.length &&
          !guilds.includes(interaction.guild.id)) ||
        (button.botIds.length && !button.botIds.includes(this.botId))
      ) {
        if (!this.silent) {
          console.log(
            `button interaction not found, interactionID: ${interaction.id} | customID: ${interaction.customId}`
          );
        }
        return;
      }

      return button.execute(this.guards, interaction, this);
    }

    // if interaction is a button
    if (interaction.isSelectMenu()) {
      const menu = this.selectMenus.find(
        (DSelectMenu) => DSelectMenu.id === interaction.customId
      );

      const guilds = await resolveIGuild(this, [
        ...botGuildsResolved,
        ...(menu?.guilds ?? []),
      ]);

      if (
        !menu ||
        (interaction.guild &&
          guilds.length &&
          !guilds.includes(interaction.guild.id)) ||
        (menu.botIds.length && !menu.botIds.includes(this.botId))
      ) {
        if (!this.silent) {
          console.log(
            `selectMenu interaction not found, interactionID: ${interaction.id} | customID: ${interaction.customId}`
          );
        }
        return;
      }

      return menu.execute(this.guards, interaction, this);
    }

    // if interaction is context menu
    if (interaction.isContextMenu()) {
      const applicationCommand = this.allApplicationCommands.find(
        (cmd) =>
          cmd.type !== "CHAT_INPUT" && cmd.name === interaction.commandName
      );

      const guilds = await resolveIGuild(this, [
        ...botGuildsResolved,
        ...(applicationCommand?.guilds ?? []),
      ]);

      if (
        !applicationCommand ||
        (interaction.guild &&
          guilds.length &&
          !guilds.includes(interaction.guild.id)) ||
        (applicationCommand.botIds.length &&
          !applicationCommand.botIds.includes(this.botId))
      ) {
        if (!this.silent) {
          console.log(
            `context menu interaction not found, name: ${interaction.commandName}`
          );
        }
        return;
      }

      if (
        applicationCommand.botIds.length &&
        !applicationCommand.botIds.includes(this.botId)
      ) {
        return;
      }

      return applicationCommand.execute(this.guards, interaction, this);
    }

    // If the interaction isn't a slash command, return
    if (!interaction.isCommand()) {
      return;
    }

    // Get the interaction group tree
    const tree = this.getApplicationCommandGroupTree(interaction);
    const applicationCommand = this.getApplicationCommandFromTree(tree);

    if (
      !applicationCommand ||
      (applicationCommand.botIds.length &&
        !applicationCommand.botIds.includes(this.botId))
    ) {
      if (this.silent) {
        console.log(
          `interaction not found, commandName: ${interaction.commandName}`
        );
      }
      return;
    }

    // Parse the options values and inject it into the @Slash method
    return applicationCommand.execute(this.guards, interaction, this);
  }

  /**
   * Fetch prefix for message
   * @param message messsage instance
   * @returns
   */
  getMessagePrefix(message: Message) {
    if (typeof this.prefix === "string") {
      return this.prefix;
    }

    return this.prefix(message);
  }

  /**
   *
   * @param prefix command prefix
   * @param message original message
   * @param caseSensitive allow insentive execution for simple commands
   * @returns
   */
  parseCommand(
    prefix: string,
    message: Message,
    caseSensitive = false
  ): undefined | SimpleCommandMessage {
    const escapePrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const prefixRegex = RegExp(`^${escapePrefix}`);
    const isCommand = prefixRegex.test(message.content);
    if (!isCommand) {
      return undefined;
    }

    const contentWithoutPrefix =
      message.content.replace(prefixRegex, "").trim() + " ";

    const commandRaw = this.allSimpleCommands.find((cmd) =>
      caseSensitive
        ? contentWithoutPrefix.startsWith(`${cmd.name} `)
        : contentWithoutPrefix
            .toLowerCase()
            .startsWith(`${cmd.name.toLowerCase()} `)
    );

    if (!commandRaw) {
      return undefined;
    }

    const commandArgs = contentWithoutPrefix
      .replace(new RegExp(commandRaw.name, "i"), "")
      .trim();

    const command = new SimpleCommandMessage(
      prefix,
      commandRaw.name,
      commandArgs,
      message,
      commandRaw.command
    );

    return command;
  }

  /**
   * Execute the corresponding @SimpleCommand based on an message instance
   * @param message The discord.js message instance
   * @param options execution options ex. caseSensitive
   * @returns
   */
  async executeCommand(
    message: Message,
    options?: { caseSensitive?: boolean }
  ) {
    const botGuildsResolved = await this.botGuildsResolved;

    if (!message) {
      if (!this.silent) {
        console.log("message is undefined");
      }
      return;
    }

    const prefix = await this.getMessagePrefix(message);
    if (!prefix) {
      if (!this.silent) {
        console.log("command prefix not found");
      }
      return;
    }

    const command = this.parseCommand(
      prefix,
      message,
      options?.caseSensitive ?? false
    );
    if (!command) {
      return;
    }

    // validate bot id
    if (
      command.info.botIds.length &&
      !command.info.botIds.includes(this.botId)
    ) {
      return;
    }

    // validate guild id
    const commandGuilds = await resolveIGuild(this, [
      ...botGuildsResolved,
      ...command.info.guilds,
    ]);
    if (
      message.guild?.id &&
      commandGuilds.length &&
      !commandGuilds.includes(message.guild.id)
    ) {
      return;
    }

    // check dm allowed or not
    if (!command.info.directMessage && !message.guild) {
      return;
    }

    // check for member permissions
    if (command.info.defaultPermission) {
      // when default perm is on
      const permissions = await command.info.permissionsPromise(
        command.message.guild
      );
      const userPermissions = permissions.filter(
        (perm) => perm.type === "USER"
      );
      const rolePermissions = permissions.filter(
        (perm) => perm.type === "ROLE"
      );

      const isUserIdNotAllowed =
        userPermissions.some((perm) => perm.id === message.member?.id) ||
        rolePermissions.some((perm) =>
          message.member?.roles.cache.has(perm.id)
        );

      // user is not allowed to access this command
      if (isUserIdNotAllowed) {
        if (this.unauthorizedHandler) {
          if (typeof this.unauthorizedHandler === "string") {
            message.reply(this.unauthorizedHandler);
            return;
          }
          await this.unauthorizedHandler(command);
        }
        return;
      }
    } else {
      // when default perm is off
      const permissions = await command.info.permissionsPromise(
        command.message.guild
      );
      const userPermissions = permissions.filter(
        (perm) => perm.type === "USER"
      );
      const rolePermissions = permissions.filter(
        (perm) => perm.type === "ROLE"
      );

      const isUserIdAllowed =
        userPermissions.some((perm) => perm.id === message.member?.id) ||
        rolePermissions.some((perm) =>
          message.member?.roles.cache.has(perm.id)
        );

      // user does not have any permission to access this command
      if (!isUserIdAllowed) {
        if (this.unauthorizedHandler) {
          if (typeof this.unauthorizedHandler === "string") {
            message.reply(this.unauthorizedHandler);
            return;
          }
          await this.unauthorizedHandler(command);
        }
        return;
      }
    }

    return command.info.execute(this.guards, command, this);
  }

  /**
   * Manually trigger an event (used for tests)
   * @param event The event
   * @param params Params to inject
   * @param once Trigger an once event
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger(event: DiscordEvents, params?: any, once = false): Promise<any[]> {
    return this.decorators.trigger(this.guards, event, this, once)(params);
  }

  /**
   * Manually build the app
   */
  async build() {
    await this.decorators.build();
  }
}
