const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");
const { v4: uuidv4 } = require("uuid");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// ====== BOT LOGIN ======
client.login("YOUR_TOKEN_HERE");

// ====== READY EVENT ======
client.on(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  // Send auction embed on startup
  try {
    const channel = await client.channels.fetch("YOUR_CHANNEL_ID_HERE"); // 👈 Replace this
    const embed = new EmbedBuilder()
      .setTitle("🎟️ Start an Auction")
      .setDescription("Click below to open a ticket and auction your pet or item.")
      .setColor("Green");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("request_ticket")
        .setLabel("Request Auction Ticket")
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({ embeds: [embed], components: [row] });
  } catch (err) {
    console.error("❌ Failed to send auction ticket embed:", err);
  }
});

// ====== INTERACTION HANDLER ======
client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === "request_ticket") {
      const modal = new ModalBuilder()
        .setCustomId("auction_modal")
        .setTitle("Auction Ticket Request")
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("pet_description")
              .setLabel("Describe the pet or item to auction")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );
      return interaction.showModal(modal);
    }

    if (interaction.customId === "close_ticket") {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("generate_transcript")
          .setLabel("Generate Transcript")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("delete_channel")
          .setLabel("Delete Channel")
          .setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({
        embeds: [new EmbedBuilder().setTitle("Close Ticket Options")],
        components: [row],
        ephemeral: true,
      });
    }

    if (interaction.customId === "generate_transcript") {
      return interaction.reply({
        content: "📄 Transcript feature is under development.",
        ephemeral: true,
      });
    }

    if (interaction.customId === "delete_channel") {
      await interaction.channel.send("🗑️ Channel will be deleted...");
      return setTimeout(() => interaction.channel.delete(), 3000);
    }
  }

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "auction_modal"
  ) {
    const petDesc = interaction.fields.getTextInputValue("pet_description");
    const ticketId = uuidv4().split("-")[0];
    const guild = interaction.guild;

    const adminRole = guild.roles.cache.find(
      (r) => r.name === "AUCTIONEER"
    );
    const bidderRole = guild.roles.cache.find(
      (r) => r.name === "BIDDER"
    );

    const channel = await guild.channels.create({
      name: `auction-${ticketId}`,
      type: ChannelType.GuildText,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        ...(bidderRole
          ? [
              {
                id: bidderRole.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.SendMessages,
                ],
              },
            ]
          : []),
        ...(adminRole
          ? [
              {
                id: adminRole.id,
                allow: [
                  PermissionsBitField.Flags.ViewChannel,
                  PermissionsBitField.Flags.ManageMessages,
                ],
              },
            ]
          : []),
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
          ],
        },
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle("🎟️ Auction Ticket Opened")
      .setDescription(
        `**Auction Description:**\n${petDesc}\n\nOnly members with the **BIDDER** role can place bids.`
      )
      .setFooter({ text: `Ticket ID: ${ticketId}` })
      .setColor("Blurple");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@&${bidderRole?.id || ""}>`,
      embeds: [embed],
      components: [row],
    });

    await interaction.reply({
      content: `✅ Your ticket has been created: <#${channel.id}>`,
      ephemeral: true,
    });
  }
});
