using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace api.Models;

public class SsoExchangeDto
{
    public string Token { get; set; } = string.Empty;
}