using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Comzera.StrategySuite.Api.Models;

public class Expense
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Description { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    public DateTime Date { get; set; }

    public bool IsPaid { get; set; }

    public bool IsFixed { get; set; } // For recurring expenses

    public int CompanyId { get; set; }
    
    [ForeignKey("CompanyId")]
    public Company? Company { get; set; }
}
