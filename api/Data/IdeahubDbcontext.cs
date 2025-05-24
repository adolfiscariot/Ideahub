using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using api.Models;

namespace api.Data;

public class IdeahubDbContext : IdentityDbContext<IdeahubUser> {
    public IdeahubDbContext(DbContextOptions<IdeahubDbContext> options) : base(options){}
    public DbSet<Group> Groups {get; set;}
    public DbSet<Idea> Ideas {get; set;}
    public DbSet<Project> Projects {get; set;}
    public DbSet<UserGroup> UserGroups {get; set;} //joint table for users and groups(many-to-many r/ship)
    public DbSet<Vote> Votes {get; set;}
    public DbSet<RefreshToken> RefreshTokens { get; set; }

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder); //ensure Identity's configurations are added before our own

        //Group configurations
        builder.Entity<Group>(g =>
        {
            g.HasKey(g => g.Id);

            //Properties
            g.Property(g => g.Name)
                .HasMaxLength(256)
                .IsRequired();

            g.Property(g => g.Description)
                .HasColumnType("text")
                .IsRequired();

            g.Property(g => g.IsActive)
                .IsRequired()
                .HasDefaultValue(true);

            g.Property(g => g.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'") //for postgres
                .ValueGeneratedOnAdd(); //createdAt should only be set during creation of new a group & ignored afterwards.

            g.HasQueryFilter(g => !g.IsDeleted); //Filter every query by removing all "deleted" ideas

            g.Property(g => g.DeletedAt)
                .HasColumnName("DeletedAt");

            g.Property(g => g.IsDeletedBy)
                .HasColumnName("DeletedByUserId");

            //Foreign Key
            g.HasOne(g => g.CreatedByUser)
                .WithMany(u => u.GroupsCreated)
                .HasForeignKey(u => u.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict); //User can't delete account if they've created a group

            //Navigation
            g.HasMany(g => g.UserGroups)
                .WithOne(ug => ug.Group)
                .OnDelete(DeleteBehavior.Cascade);

            //Indexes
            g.HasIndex(g => g.Name);
            g.HasIndex(g => g.IsActive);
            g.HasIndex(g => g.IsDeleted);
        });

        //Idea Configuration
        builder.Entity<Idea>(i =>
        {
            i.HasKey(i => i.Id);

            //Properties
            i.Property(i => i.Title)
                .HasMaxLength(256)
                .IsRequired();

            i.Property(i => i.Description)
                .IsRequired()
                .HasColumnType("text");

            i.Property(i => i.IsPromotedToProject)
                .HasDefaultValue(false);

            i.Property(i => i.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'")
                .ValueGeneratedOnAdd();

            i.Property(i => i.UpdatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'")
                .ValueGeneratedOnAddOrUpdate();

            i.Property(i => i.Status)
                .IsRequired()
                .HasMaxLength(24)
                .HasConversion<string>();

            i.HasQueryFilter(i => !i.IsDeleted);

            i.Property(i => i.DeletedAt)
                .HasColumnName("DeletedAt");

            //Foreign Keys
            i.HasOne(i => i.User)
                .WithMany(u => u.Ideas)
                .HasForeignKey(i => i.UserId)
                .OnDelete(DeleteBehavior.Restrict); //Prevent deleting a user until all their ideas are deleted

            i.HasOne(i => i.Group)
                .WithMany(g => g.Ideas)
                .HasForeignKey(i => i.GroupId)
                .OnDelete(DeleteBehavior.Cascade); //Delete a group's ideas when the group is deleted

            //Navigation
            i.HasMany(i => i.Projects)
                .WithOne(p => p.Idea)
                .OnDelete(DeleteBehavior.Restrict); //Can't delete an idea that has projects

            i.HasMany(i => i.Votes)
                .WithOne(v => v.Idea)
                .OnDelete(DeleteBehavior.Cascade); //If an idea is deleted all its votes go with it.

            //Index
            i.HasIndex(i => i.Title);
            i.HasIndex(i => i.Status);
            i.HasIndex(i => i.GroupId);
            i.HasIndex(i => i.UserId);
            i.HasIndex(i => i.IsDeleted);
        });

        //Project Configuration
        builder.Entity<Project>(p =>
        {
            p.HasKey(p => p.Id);

            //Properties
            p.Property(p => p.Title)
                .IsRequired()
                .HasMaxLength(256);

            p.Property(p => p.Description)
                .IsRequired()
                .HasColumnType("text");

            p.Property(p => p.Status)
                .IsRequired()
                .HasMaxLength(24)
                .HasDefaultValue(ProjectStatus.Planning)
                .HasConversion<string>();

            p.Property(p => p.CreatedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'")
                .ValueGeneratedOnAdd();

            p.Property(p => p.EndedAt)
                .HasColumnType("timestamp with time zone");

            p.HasQueryFilter(p => !p.IsDeleted);

            p.Property(p => p.DeletedAt)
                .HasColumnName("DeletedAt");

            //Foreign Keys
            p.HasOne(p => p.Idea)
                .WithMany(i => i.Projects)
                .HasForeignKey(p => p.IdeaId)
                .OnDelete(DeleteBehavior.Restrict); //Can't delete an idea that has projects

            p.HasOne(p => p.Group)
                .WithMany(g => g.Projects)
                .HasForeignKey(p => p.GroupId)
                .OnDelete(DeleteBehavior.Restrict); //Can't delete a group with projects

            p.HasOne(p => p.CreatedByUser)
                .WithMany(u => u.ProjectsCreated)
                .HasForeignKey(p => p.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            p.HasOne(p => p.OverseenByUser)
                .WithMany(u => u.ProjectsOverseen)
                .HasForeignKey(p => p.OverseenByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            //Indexes
            p.HasIndex(p => p.Title);
            p.HasIndex(p => p.Status);
            p.HasIndex(p => p.CreatedByUserId);
            p.HasIndex(p => p.OverseenByUserId);
            p.HasIndex(p => p.IsDeleted);
        });


        //User configuration
        builder.Entity<IdeahubUser>(u =>
        {
            u.ToTable("Users");

            u.Property(u => u.CreatedAt)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'")
                .ValueGeneratedOnAdd();

            u.Property(u => u.LastLoginAt)
                .HasColumnType("timestamp with time zone")
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'");

            u.Property(u => u.DisplayName)
                .IsRequired()
                .HasMaxLength(64);

            u.HasQueryFilter(u => !u.IsDeleted);

            u.Property(u => u.DeletedAt)
                .HasColumnName("DeletedAt");

            //Indexes
            u.HasIndex(u => u.DisplayName);
            u.HasIndex(u => u.Email);
            u.HasIndex(u => u.IsDeleted);
        });


        //UserGroup Configuration
        builder.Entity<UserGroup>(ug =>
        {
            ug.HasKey(ug => new { ug.UserId, ug.GroupId });

            //Properties
            ug.Property(ug => ug.JoinedAt)
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'")
                .ValueGeneratedOnAdd();

            //Navigation
            ug.HasOne(ug => ug.User)
                .WithMany(u => u.UserGroups)
                .HasForeignKey(ug => ug.UserId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade); //When user is deleted, they're no longer a part of the user group

            ug.HasOne(ug => ug.Group)
                .WithMany(g => g.UserGroups)
                .HasForeignKey(ug => ug.GroupId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.Cascade);

            //Indexes
            ug.HasIndex(ug => ug.UserId);
            ug.HasIndex(ug => ug.GroupId);
        });


        //Vote Configuration
        builder.Entity<Vote>(v =>
        {
            v.HasKey(v => v.Id);

            //Properties
            v.Property(v => v.VotedAt)
                .IsRequired()
                .HasDefaultValueSql("NOW() AT TIME ZONE 'UTC'")
                .ValueGeneratedOnAdd();

            v.HasQueryFilter(v => !v.IsDeleted);

            v.Property(v => v.DeletedAt)
                .HasColumnName("DeletedAt");

            //Foreign keys
            v.HasOne(v => v.Idea)
                .WithMany(i => i.Votes)
                .HasForeignKey(v => v.IdeaId)
                .OnDelete(DeleteBehavior.Cascade); //Idea goes all its votes go with it

            v.HasOne(v => v.User)
                .WithMany(u => u.Votes)
                .HasForeignKey(v => v.UserId)
                .OnDelete(DeleteBehavior.Cascade); //User goes all their votes go with them

            //Indexes
            v.HasIndex(v => new { v.UserId, v.IdeaId }).IsUnique(); //No duplicate votes for each idea
        });

        //RefreshToken configuration
        builder.Entity<RefreshToken>(rti =>
        {
            rti.HasKey(rti => rti.TokenId);

            //Properties
            rti.Property(rti => rti.Token)
                .IsRequired();

            rti.Property(rti => rti.RefreshTokenExpiry)
                .IsRequired()
                .HasColumnType("timestamp with time zone");

            rti.Property(rti => rti.HasExpired)
                .IsRequired()
                .HasDefaultValue(false);

            //Foreign key
            rti.HasOne(rti => rti.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(rti => rti.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            //Index
            rti.HasIndex(rti => rti.Token)
                .IsUnique();
        });

        //Rename Roles table
        builder.Entity<IdentityRole>(r =>
        {
            r.ToTable("Roles");
        });
    }
}
