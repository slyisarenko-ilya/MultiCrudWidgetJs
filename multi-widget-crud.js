
/**
 * Добавляет функционал добавления/удаление для групп элементов форм.
 * Позволяет клонировать группы элементов и выполнять операции добавления/удаления
 */
var MultiItemCrudWidget = (function () {
    const DEFAULT_ROW_ELEMENT_CLASS_NAME = "row-element";
    const DEFAULT_ROW_ELEMENT_TEMPLATE = "<div></div>";
    const DEFAULT_HIDDEN_CLASS_NAME = "hidden";


    function MultiItemCrudWidget(options) {
        this.items;
        this.rowElementClassName;
        this.removeWidgetSkeleton;
        this.addWidgetSkeleton;

        this.rowElementTemplate;
        this.wrapperSelector;
        this.dynamicWidgetsContainer;

        this.dynamicWidgetsContainerSkeleton;

        this.skeletonSelectors;
        this.hiddenClassName;

        /**функция вызывается для каждой созданной плагином строки.
         * здесь можно разместить дополнительную логику инициализации строк
         * @param rowSelector
         */
        this.afterRowCreate;

        /**
         * @param rowWidget, jQuery обёртка для каждого элемента-строки, содержащего виджеты с данными
         * @param item - данные: например {countryId:12, cityId: 15, regionId: 555, index: 1}
         */
        this.synchronizeWidgetWithRowData;

        __construct = function(options){
            initializeOptions(options);
            layoutWidgets();
        }

        var initializeOptions = function (options) {
            items = options.items;

            removeWidgetSkeleton = options.removeWidgetSkeleton;
            addWidgetSkeleton = options.addWidgetSkeleton;
            hiddenClassName = options.hiddenClassName?options.hiddenClassName:DEFAULT_HIDDEN_CLASS_NAME;
            rowElementTemplate = options.rowElementTemplate?options.rowElementTemplate:DEFAULT_ROW_ELEMENT_TEMPLATE;
            wrapperSelector = options.wrapperSelector;
            skeletonSelectors = options.skeletonSelectors;
            rowElementClassName = options.rowElementClassName ? options.rowElementClassName:DEFAULT_ROW_ELEMENT_CLASS_NAME;
            dynamicWidgetsContainerSkeleton = options.dynamicWidgetsContainerSkeleton ? options.dynamicWidgetsContainerSkeleton: "<div></div>";
            afterRowCreate = options.afterRowCreate;
            synchronizeWidgetWithRowData = options.synchronizeWidgetWithRowData;

        }

        var layoutWidgets = function(){
            dynamicWidgetsContainer = $(dynamicWidgetsContainerSkeleton);
            $(wrapperSelector).append(dynamicWidgetsContainer);

            //разместить виджеты внутри контейнера
            //столько, сколько items
            for(var itemIndex in items){
                var item = items[itemIndex];
                insertRowWidget(item);
            }

            // добавить кнопку добавления элементов (+)

            var addWidget = $(addWidgetSkeleton).clone();
            addWidget.removeClass("hidden");
            addWidget.removeClass(addWidgetSkeleton);
            $(wrapperSelector).append(addWidget);
            attachAddHandler(addWidget);

            synchronizeWidgets();
            syncValuesForAllWidgets();
        }


        var addRemoveWidget = function(rowWidget, dataIndex){
            //добавить кнопки удалить для каждого + функционал
            var removeWidget = $(removeWidgetSkeleton).clone();
            removeWidget.removeClass("hidden");
            removeWidget.attr("data-index", dataIndex);
            removeWidget.removeClass(removeWidgetSkeleton.replace('.', ''));
            attachRemoveOrClearHandler(removeWidget);

            rowWidget.append(removeWidget);
        }

        var attachRemoveOrClearHandler = function(widget){
            $(widget).on('click', function(){
                var dataIndex = $(this).attr('data-index');
                if(hasMoreThenOneItems()){
                    removeRow(dataIndex);
                } else {
                    clearRow(dataIndex);
                    syncValuesForAllWidgets();
                }
                synchronizeWidgets();
                return false; //= cancel bubble
            });
        }

        var hasMoreThenOneItems = function(){
            return items.length > 1;
        }

        var removeRow = function(index){
            var arrayIndex = getArrayIndexByItemIndex(index);

            if (arrayIndex != null) {

                items.splice(arrayIndex, 1);
            }
        }

        var clearRow = function(index){
            var item = getItemByIndex(index);
            if(item != null){
                clearItem(item);
            }
        }

        var clearItem = function(item){
            for(var key in item){
                if(key != 'index'){
                    item[key] = null;
                }
            }
        }

        var getItemByIndex = function(index){
            for(var i in items){
                var item = items[i];
                if(item.index == index){
                    return item;
                }
            }
            return null;
        }


        var getArrayIndexByItemIndex = function(index){
            for(var i in items){
                var item = items[i];
                if(item.index == index){
                    return i;
                }
            }
            return null;
        }

        var createEmptyItem = function(){
            var nextAvailableIndex = getNextAvailableIndex();
            return { 'index': nextAvailableIndex};
        }

        var getNextAvailableIndex = function(){
            var maxIndex = -1;
            for(var i in items){
                var item = items[i];
                maxIndex = Math.max(item.index);
            }
            var availableIndex = maxIndex + 1;
            return availableIndex;
        }

        var addRow = function(){
            var newItem = createEmptyItem();
            items.push(newItem);
        }

        var attachAddHandler = function(addWidget){
            $(addWidget).on('click', function(){
                addRow();
                synchronizeWidgets();
                return false; //= cancel bubble
            });
        }

        var synchronizeWidgets = function(){
            //пройтись по всем items
            //если в items нет записи а виджет есть. то необходимо удалить виджет
            //если в items есть запись, а виджета нет - то необходимо добавить виджет
            // (поскольку добавить виджет можно только в конец по логике работы программы,
            // то и при синхронизации добавлять будем в конец)
            for(var i in items){
                var item = items[i];
                var dataIndex = item.index;
                var rowWidget = $(wrapperSelector + " ." + rowElementClassName + "[data-index=" +dataIndex + "]");
                var rowExists = rowWidget.length > 0;
                if(!rowExists){
                    rowWidget = insertRowWidget(item);
                }
            }

            dynamicWidgetsContainer.children("." + rowElementClassName).each(function(i, element){
                var rowWidget = $(element);
                var dataIndex = rowWidget.attr('data-index');
                var itemByIndex = getItemByIndex(dataIndex);
                if(itemByIndex == null){
                    rowWidget.remove();
                }
            });
        }

        var syncValuesForAllWidgets = function(){
            for(var i in items){
                var item = items[i];
                var dataIndex = item.index;
                var rowSelector = wrapperSelector + " ." + rowElementClassName + "[data-index=" +dataIndex + "]";
                var rowWidget = $(rowSelector);

                if(synchronizeWidgetWithRowData){
                    synchronizeWidgetWithRowData(rowWidget, item);
                }
            }
        }

        var insertRowWidget = function(item){ //specific
            var rowWidget = $(rowElementTemplate).clone();
            rowWidget.removeClass("hidden");
            rowWidget.attr('data-index', item.index);
            rowWidget.addClass(rowElementClassName);

            for(var itemKeyName in skeletonSelectors){
                var skeletonSelector = skeletonSelectors[itemKeyName];

                var widget = $(skeletonSelector).clone();
                widget.removeClass(skeletonSelector.replace('.', ''));
                widget.removeClass("hidden");
                // выбрать текущие
                var itemId = item[itemKeyName];
                $(widget).find('option').each(function(index, element){
                    if($(element).attr('value') == itemId){
                        $(element).attr('selected', 'selected');
                    }
                });
                rowWidget.append(widget);
            }

            addRemoveWidget(rowWidget, item.index);

            dynamicWidgetsContainer.append(rowWidget);

            var rowSelector = wrapperSelector+ " ." + rowElementClassName+"[data-index=" + item.index + "]";

            if(afterRowCreate){
                afterRowCreate(rowSelector);
            }

            return rowWidget;
        }

        this.reset = function(jsonData){
            items = jsonData;
            synchronizeWidgets();
            syncValuesForAllWidgets();
        }

        __construct(options);

    }

    return MultiItemCrudWidget;
})();
