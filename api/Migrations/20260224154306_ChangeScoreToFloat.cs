using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Ideahub.Migrations
{
    /// <inheritdoc />
    public partial class ChangeScoreToFloat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Ideas",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "Open",
                oldClrType: typeof(string),
                oldType: "character varying(24)",
                oldMaxLength: 24);

            migrationBuilder.AlterColumn<float>(
                name: "Score",
                table: "Ideas",
                type: "float",
                nullable: false,
                defaultValue: 0f,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "AiReasoning",
                table: "Ideas",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurrentStage",
                table: "Ideas",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                defaultValue: "Evaluation");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AiReasoning",
                table: "Ideas");

            migrationBuilder.DropColumn(
                name: "CurrentStage",
                table: "Ideas");

            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "Ideas",
                type: "character varying(24)",
                maxLength: 24,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(24)",
                oldMaxLength: 24,
                oldDefaultValue: "Open");

            migrationBuilder.AlterColumn<int>(
                name: "Score",
                table: "Ideas",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(float),
                oldType: "float",
                oldDefaultValue: 0f);
        }
    }
}
