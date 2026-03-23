using System;
using SendGrid;
using SendGrid.Helpers.Mail;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.UI.Services;
using api.Models;
using Microsoft.Extensions.Options;

namespace api.Helpers;

public interface IEmailSender
{
    Task SendEmailAsync(string toEmail, string subject, string message);
}

public class EmailSender : IEmailSender
{
    //SendGrid settings
    private readonly SendGridSettings _settings;
    private readonly ILogger<EmailSender> _logger;

    public EmailSender(IOptions<SendGridSettings> settings, ILogger<EmailSender> logger)
    {
        _settings = settings.Value; //get the configured values
        _logger = logger;
    }
    public async Task SendEmailAsync(string toEmail, string subject, string message)
    {
        //SendGrid configs
        var ApiKey = _settings.ApiKey;
        var SenderEmail = new EmailAddress(_settings.SenderEmail, _settings.SenderName);        
        var Client = new SendGridClient(ApiKey);
        var to = new EmailAddress(toEmail);
        var Message = MailHelper.CreateSingleEmail(SenderEmail, to, subject, message, message);
        var response = await Client.SendEmailAsync(Message);
        if ((int)response.StatusCode >= 400)
        {
            var body = await response.Body.ReadAsStringAsync();
            _logger.LogError($"Failed to send email to {toEmail}. Status Code: {response.StatusCode}. Error: {body}");
        }
        else
        {
            _logger.LogInformation($"Email successfully sent to {toEmail}. Status: {response.StatusCode}");
          // _logger.LogInformation($"Email successfully sent");
        }
    }
}