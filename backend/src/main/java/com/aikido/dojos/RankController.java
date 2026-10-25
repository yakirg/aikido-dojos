package com.aikido.dojos;

import com.aikido.dojos.data.*;
import java.util.Arrays;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ranks")
public class RankController {
    @GetMapping
    public List<Rank.Info> list() {
        return Arrays.stream(Rank.values()).map(Rank::info).toList();
    }
}
