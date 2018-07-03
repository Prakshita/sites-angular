import { Component, OnInit, OnDestroy } from '@angular/core';
import { debounce } from "lodash";
import { Engines, VideoEngineService, SearchDriver, SearchType, ISuggestion } from '../video-engine.service';
import { SuggestionService } from './suggestion.service';
import { Subscription } from 'rxjs';

const SEARCH_PAGE_CONFIG = {
  [Engines.Youku]: {
    url: 'http://so.youku.com/search_video/q_'
  },
  [Engines.Tencent]: {
    url: 'https://v.qq.com/x/search/?q='
  }
}

@Component({
  selector: 'app-search-box',
  templateUrl: './search-box.component.html',
  styleUrls: ['./search-box.component.scss']
})
export class SearchBoxComponent implements OnInit, OnDestroy {
  private static DEFAULT_ENGINE = Engines.Youku

  public query = ''
  public Engines = Engines
  public currentEngine = SearchBoxComponent.DEFAULT_ENGINE;

  public suggestions: ISuggestion[] = [];
  private hots: ISuggestion[];
  private driver: SearchDriver;

  public SearchType = SearchType
  public searchType = SearchType.Hot // 默认显示热搜
  public search: Function;

  querySubscription: Subscription;
  toSearchPageQuerySubscription: Subscription;

  constructor(
    private videoEngineService: VideoEngineService,
    private suggestionService: SuggestionService
  ) {
    this.driver = this.videoEngineService.getInstance(this.currentEngine);
    this.search = debounce(this.undebouncedSearch, 500);

    this.querySubscription = suggestionService.query$.subscribe((query: string) => this.setQuery(query));
    this.toSearchPageQuerySubscription = suggestionService.toSearchPageQuery$.subscribe((query: string) => this.toSearchPage(query));
  }

  /**
   * 默认显示热搜
   */
  ngOnInit() {
    this.showHottest();
  }

  ngOnDestroy() {
    this.querySubscription.unsubscribe();
    this.toSearchPageQuerySubscription.unsubscribe();
  }

  private setQuery(query) {
    if (this.query !== query) {
      this.query = query;
      this.showSuggestions(query)
    }
  }

  private toSearchPage(query: string) {
    // 因为 BehaviorService 默认会 emit 初始值
    // 防止刷新页面自动跳转到空 query 的搜索页面
    if (!query) {
      return;
    }

    const newWindow = window.open(SEARCH_PAGE_CONFIG[this.currentEngine].url + query);

    newWindow.opener = null;
  }

  public changeEngine(): void {
    console.log('this.currentEngine:', this.currentEngine);
    this.driver = this.videoEngineService.getInstance(this.currentEngine);

    if (this.query) {
      this.showSuggestions(this.query)
    } else {
      this.fetchHottest();
    }
  }

  private undebouncedSearch(query: string): void {
    this.query = query;

    if (!query) {
      this.showHottest();
    } else {
      this.showSuggestions(query);
    }
  }

  /**
   * 显示热搜
   * 带缓存
   */
  private showHottest(): void {
    this.searchType = SearchType.Hot;

    if (this.hots) {
      this.suggestions = this.hots;
    } else {
     this.fetchHottest();
    }
  }

  private fetchHottest(): void {
    this.driver.getHottest().subscribe(data => {
      this.suggestions = this.hots = data;
    });
  }

  /**
   * 显示下拉提示
   * @param query 查询词
   */
  private showSuggestions(query: string): void {
    this.searchType = SearchType.Suggestion;

    this.driver.search(query).subscribe(data => {
      this.suggestions = data;
    });
  }
}
