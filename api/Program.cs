using api.Data;
using api.Models;
using api.Helpers;
using api.Constants;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity.UI.Services;
using api.Services;
using Microsoft.IdentityModel.JsonWebTokens;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore.Diagnostics;

//Cors allowed origins
var AllowedOrigins = "AllowedOrigins";

//1. Create the builder
var builder = WebApplication.CreateBuilder(args);

//2. Add Services
//2.1 Controllers Service
builder.Services.AddControllers();

//2.2 EF Core Service
var connectionString = builder.Configuration.GetConnectionString("IdeahubString")
    ?? throw new Exception("Connection String Not Found!");

builder.Services.AddDbContext<IdeahubDbContext>(options =>
    options.UseNpgsql(connectionString)
);

//2.3 Identity Service
builder.Services.AddIdentity<IdeahubUser, IdentityRole>(options =>
    {
        //Password Settings
        options.Password.RequireDigit = true;
        options.Password.RequiredLength = 8;
        options.Password.RequireUppercase = true;
        options.Password.RequireNonAlphanumeric = true;
        //User Settings
        options.User.RequireUniqueEmail = true;
        //Sign In Settings
        //options.SignIn.RequireConfirmedEmail = true;
    })
    .AddEntityFrameworkStores<IdeahubDbContext>()
    .AddDefaultTokenProviders();

//2.4 Authentication Service
var JwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new Exception("JWT Key Not Found!");

//Convert key from hex string to byte array
var key = JwtHexToBytes.FromHexToBytes(JwtKey);

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication(options => 
{
    //Use Jwt as default token for authentication & challenges
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
})
    .AddJwtBearer(options =>
    {
        options.RequireHttpsMetadata = false; //SHOULD BE REMOVED EVENTUALLY
        options.TokenValidationParameters = new TokenValidationParameters
        {
            //Validate token issuer, audience and signature
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],

            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],

            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),

            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,

            //Map the role claim type
            RoleClaimType = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
        };
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = ctx =>
            {
                Console.WriteLine($"Auth failed: {ctx.Exception}");
                return Task.CompletedTask;
            }
        };
    });

//2.5 Authorization Service
builder.Services.AddAuthorization(options =>
{
    //SuperAdmin only can access stuff
    options.AddPolicy("SuperAdminOnly", policy =>
        policy.RequireRole(RoleConstants.SuperAdmin));

    //GroupAdmin (&SuperAdmin) can access stuff
    options.AddPolicy("GroupAdminOnly", policy =>
        policy.RequireAssertion(context => 
            context.User.IsInRole(RoleConstants.SuperAdmin) ||
            context.User.IsInRole(RoleConstants.GroupAdmin)
        )
    );
});

//2.6 CORS Service
//builder.Services.AddCors(options =>
//{
    //options.AddPolicy(AllowedOrigins, policy =>
        //policy.WithOrigins("http://localhost:4200")
              //.AllowAnyHeader()
              //.AllowAnyMethod()
    //);
//});
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowedOrigins", policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()
    );
});


//2.7 Customizing ModelState Validation
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
                    .Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

        var response = ApiResponse.Fail("Model State Validation Failed", errors);

        return new BadRequestObjectResult(response);
    };
});

//2.8 Email Sender
builder.Services.AddScoped<api.Helpers.IEmailSender, EmailSender>();

//2.9 Link the SendGridSettings class to the "SendGrid" user secrets
builder.Services.Configure<SendGridSettings>(
    builder.Configuration.GetSection("SendGridSettings"));

//2.10 IToken Service
builder.Services.AddScoped<ITokenService, TokenService>();


//3. Build the app
var app = builder.Build();

// APPLY EF MIGRATIONS HERE
//using (var scope = app.Services.CreateScope())
//{
    //var db = scope.ServiceProvider.GetRequiredService<IdeahubDbContext>();
    //db.Database.Migrate();
//}

//Seed Roles at App Startup
//using (var scope = app.Services.CreateScope())
//{
    //var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    //var roles = new[] { RoleConstants.SuperAdmin, RoleConstants.GroupAdmin, RoleConstants.RegularUser };

    //foreach (var role in roles)
    //{
        //if (!await roleManager.RoleExistsAsync(role))
        //{
            //await roleManager.CreateAsync(new IdentityRole(role));
        //}
    //}
//}

using var scope = app.Services.CreateScope();
var db = scope.ServiceProvider.GetRequiredService<IdeahubDbContext>();

var retries = 10;
while (retries > 0)
{
    try
    {
        db.Database.Migrate(); // apply migrations
        break;
    }
    catch (Npgsql.NpgsqlException)
    {
        retries--;
        Console.WriteLine("Waiting for database to be ready...");
        await Task.Delay(5000); // wait 5s
    }
}

//4. Add MiddleWare
if (app.Environment.IsDevelopment())
{
    app.UseMigrationsEndPoint();
} else
{ 
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors(AllowedOrigins);
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapFallbackToFile("index.html");

//5. Run the App
app.Run();

