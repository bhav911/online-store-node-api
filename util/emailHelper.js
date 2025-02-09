const postmark = require("postmark");

const client = new postmark.ServerClient(
  "cdc1760a-7837-4327-b6df-e823648636ad"
);

exports.sendEmail = (emailAddress, TemplateId, variables) => {
  try {
    client.sendEmailWithTemplate({
      From: "bhavyamodhiya@theslayeraa.com", // Sender address (verified in Postmark)
      To: emailAddress, // Recipient address
      TemplateId: TemplateId, // Your Postmark template ID
      TemplateModel: variables,
    });
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
