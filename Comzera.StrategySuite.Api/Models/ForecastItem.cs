using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Comzera.StrategySuite.Api.Models;

public class ForecastItem
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Description { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal BaseAmount { get; set; }

    [Column(TypeName = "decimal(5,2)")]
    public decimal EscalationPercent { get; set; }

    [Required]
    public string Type { get; set; } = "expenses"; // sales, cos, expenses

    // Store manual overrides as a JSON string
    public string? OverridesJson { get; set; }

    public int CompanyId { get; set; }
    
    [ForeignKey("CompanyId")]
    public Company? Company { get; set; }
}
