using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class ReturnTitleToIdeas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Title",
                table: "Ideas",
                type: "character varying(256)",
                maxLength: 256,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Title",
                table: "Ideas");
        }
    }
}
